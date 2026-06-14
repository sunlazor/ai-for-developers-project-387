<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\BookingType;
use App\Service\BookingTypeService;
use App\Service\SlotService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Public (Visitor) endpoints. No authentication required.
 */
#[Route('/api')]
class PublicController extends AbstractController
{
    /**
     * List active Booking Types.
     */
    #[Route('/booking-types', methods: ['GET'])]
    public function listBookingTypes(BookingTypeService $service): JsonResponse
    {
        $types = $service->listActive();

        return $this->json(array_map(fn(BookingType $bt)
            => [
            'slug' => $bt->getSlug(),
            'title' => $bt->getTitle(),
            'description' => $bt->getDescription(),
            'durationSlots' => $bt->getDurationSlots(),
            'active' => $bt->isActive(),
        ], $types));
    }

    /**
     * The raw set of bookable Slots (available and unbooked) within the Visitor horizon.
     */
    #[Route('/availability', methods: ['GET'])]
    public function getAvailability(SlotService $service): JsonResponse
    {
        return $this->json($service->getVisitorAvailability());
    }

    /**
     * Create a Booking.
     */
    #[Route('/bookings', methods: ['POST'])]
    public function createBooking(
        Request $request,
        SlotService $slotService,
        BookingTypeService $btService,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $bookingTypeSlug = $data['bookingTypeSlug'] ?? '';
        $startSlotStr = $data['startSlot'] ?? '';
        $visitorName = $data['visitorName'] ?? '';
        $visitorEmail = $data['visitorEmail'] ?? '';

        // Validate required fields
        if (empty($bookingTypeSlug) || empty($startSlotStr) || empty($visitorName) || empty($visitorEmail)) {
            return $this->json(['code' => 'unprocessable', 'message' => 'Missing required fields.'], 422);
        }

        // Validate email format
        if (!filter_var($visitorEmail, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['code' => 'unprocessable', 'message' => 'Invalid email format.'], 422);
        }

        // Find the Booking Type
        $bookingType = $btService->find($bookingTypeSlug);
        if ($bookingType === null) {
            return $this->json(['code' => 'not_found', 'message' => 'Booking Type not found.'], 404);
        }
        if (!$bookingType->isActive()) {
            return $this->json(['code' => 'unprocessable', 'message' => 'Booking Type is deactivated.'], 422);
        }

        // Parse startSlot
        $utc = new \DateTimeZone('UTC');
        $startSlot = \DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s\Z', $startSlotStr, $utc)
            ?: \DateTimeImmutable::createFromFormat(\DateTimeInterface::ATOM, $startSlotStr, $utc);
        if ($startSlot === false) {
            return $this->json(['code' => 'unprocessable', 'message' => 'Invalid startSlot format.'], 422);
        }

        try {
            $booking = $slotService->createBooking(
                $bookingTypeSlug,
                $startSlot,
                $visitorName,
                $visitorEmail,
                $bookingType->getDurationSlots(),
            );
        } catch (\RuntimeException $e) {
            $codeMap = [409 => 409, 422 => 422];
            $statusCode = $codeMap[$e->getCode()] ?? 422;
            $statusCodeMap = [409 => 'conflict', 422 => 'unprocessable'];
            $domainCode = $statusCodeMap[$statusCode] ?? 'unprocessable';

            return $this->json(['code' => $domainCode, 'message' => $e->getMessage()], $statusCode);
        }

        return $this->json([
            'id' => $booking->getId(),
            'bookingTypeSlug' => $booking->getBookingTypeSlug(),
            'startSlot' => $booking->getStartSlot()->format('Y-m-d\TH:i:s\Z'),
            'visitorName' => $booking->getVisitorName(),
            'visitorEmail' => $booking->getVisitorEmail(),
        ], 201);
    }
}
