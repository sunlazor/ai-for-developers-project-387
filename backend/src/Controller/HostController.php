<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Booking;
use App\Entity\Slot;
use App\Entity\SlotState;
use App\Service\BookingTypeService;
use App\Service\SlotService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Host-only endpoints. Require Bearer authentication (enforced by HostAuthSubscriber).
 */
#[Route('/api/host')]
class HostController extends AbstractController
{
    /**
     * Create a Booking Type.
     */
    #[Route('/booking-types', methods: ['POST'])]
    public function createBookingType(Request $request, BookingTypeService $service): JsonResponse
    {
        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        $slug = $data['slug'] ?? '';
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        $durationSlots = $data['durationSlots'] ?? 0;

        if (empty($slug) || empty($title) || empty($description) || $durationSlots < 1) {
            return $this->json(['code' => 'unprocessable', 'message' => 'Invalid Booking Type data.'], 422);
        }

        try {
            $bt = $service->create($slug, $title, $description, (int)$durationSlots);
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 422) {
                return $this->json(['code' => 'unprocessable', 'message' => $e->getMessage()], 422);
            }
            throw $e;
        }

        return $this->json([
            'slug' => $bt->getSlug(),
            'title' => $bt->getTitle(),
            'description' => $bt->getDescription(),
            'durationSlots' => $bt->getDurationSlots(),
            'active' => $bt->isActive(),
        ], 201);
    }

    /**
     * Update a Booking Type (title and/or description only).
     */
    #[Route('/booking-types/{slug}', methods: ['PATCH'])]
    public function updateBookingType(string $slug, Request $request, BookingTypeService $service): JsonResponse
    {
        $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        try {
            $bt = $service->update($slug, $data['title'] ?? null, $data['description'] ?? null);
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 404) {
                return $this->json(['code' => 'not_found', 'message' => $e->getMessage()], 404);
            }
            throw $e;
        }

        return $this->json([
            'slug' => $bt->getSlug(),
            'title' => $bt->getTitle(),
            'description' => $bt->getDescription(),
            'durationSlots' => $bt->getDurationSlots(),
            'active' => $bt->isActive(),
        ]);
    }

    /**
     * Deactivate a Booking Type.
     */
    #[Route('/booking-types/{slug}/deactivate', methods: ['POST'])]
    public function deactivateBookingType(string $slug, BookingTypeService $service): JsonResponse
    {
        try {
            $bt = $service->deactivate($slug);
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 404) {
                return $this->json(['code' => 'not_found', 'message' => $e->getMessage()], 404);
            }
            throw $e;
        }

        return $this->json([
            'slug' => $bt->getSlug(),
            'title' => $bt->getTitle(),
            'description' => $bt->getDescription(),
            'durationSlots' => $bt->getDurationSlots(),
            'active' => $bt->isActive(),
        ]);
    }

    /**
     * Activate a previously deactivated Booking Type.
     */
    #[Route('/booking-types/{slug}/activate', methods: ['POST'])]
    public function activateBookingType(string $slug, BookingTypeService $service): JsonResponse
    {
        try {
            $bt = $service->activate($slug);
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 404) {
                return $this->json(['code' => 'not_found', 'message' => $e->getMessage()], 404);
            }
            throw $e;
        }

        return $this->json([
            'slug' => $bt->getSlug(),
            'title' => $bt->getTitle(),
            'description' => $bt->getDescription(),
            'durationSlots' => $bt->getDurationSlots(),
            'active' => $bt->isActive(),
        ]);
    }

    /**
     * List all Booking Types (including inactive) for the Host Dashboard.
     */
    #[Route('/booking-types', methods: ['GET'])]
    public function listAllBookingTypes(BookingTypeService $service): JsonResponse
    {
        $bts = $service->listAll();

        return $this->json(array_map(fn($bt)
            => [
            'slug' => $bt->getSlug(),
            'title' => $bt->getTitle(),
            'description' => $bt->getDescription(),
            'durationSlots' => $bt->getDurationSlots(),
            'active' => $bt->isActive(),
        ], $bts));
    }

    /**
     * All Slots with their state within the Host horizon.
     */
    #[Route('/availability', methods: ['GET'])]
    public function getHostAvailability(SlotService $service): JsonResponse
    {
        return $this->json($service->getHostAvailability());
    }

    /**
     * Bulk open/close Slots.
     */
    #[Route('/availability', methods: ['PUT'])]
    public function editAvailability(
        Request $request,
        EntityManagerInterface $em,
        SlotService $slotService,
    ): JsonResponse {
        $entries = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

        if (!is_array($entries) || empty($entries)) {
            return $this->json(['code' => 'unprocessable', 'message' => 'Request body must be a non-empty array.'],
                422);
        }

        $utc = new \DateTimeZone('UTC');
        $now = new \DateTimeImmutable('now', $utc);
        $horizonEnd = $slotService->hostHorizonEnd($now);
        $errors = [];
        $updatedStarts = [];

        foreach ($entries as $i => $entry) {
            $startStr = $entry['start'] ?? '';
            $state = $entry['state'] ?? '';

            // Parse start
            $start = \DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s\Z', $startStr, $utc)
                ?: \DateTimeImmutable::createFromFormat(\DateTimeInterface::ATOM, $startStr, $utc);
            if ($start === false) {
                $errors[] = "Entry #{$i}: invalid start format.";
                continue;
            }

            // Validate grid alignment
            if (!SlotService::isAligned($start)) {
                $errors[] = "Entry #{$i}: start not aligned to 15-minute boundary.";
                continue;
            }

            // Validate state
            if (!in_array($state, ['available', 'unavailable'], true)) {
                $errors[] = "Entry #{$i}: invalid state '{$state}' (must be 'available' or 'unavailable').";
                continue;
            }

            // Must be within Host horizon
            if ($start > $horizonEnd) {
                $errors[] = "Entry #{$i}: slot beyond Host horizon.";
                continue;
            }

            // Find or create the slot
            $slot = $em->getRepository(Slot::class)->findOneBy(['start' => $start]);
            if ($slot === null) {
                // Slots in the horizon should already exist (fixtures created them).
                // But if the app is run without fixtures, create on the fly.
                $slot = new Slot($start);
                $em->persist($slot);
            }

            // Cannot edit booked slots
            if ($slot->getState() === SlotState::Booked) {
                $errors[] = "Entry #{$i}: cannot edit a booked slot.";
                continue;
            }

            $slot->setState(SlotState::from($state));
            $updatedStarts[] = $start->format('Y-m-d\TH:i:s\Z');
        }

        $em->flush();

        if (!empty($errors)) {
            return $this->json(
                ['code' => 'unprocessable', 'message' => implode(' ', $errors)],
                422,
            );
        }

        // Return all slots in the host horizon (updated state)
        return $this->json($slotService->getHostAvailability($now));
    }

    /**
     * List scheduled Bookings.
     */
    #[Route('/bookings', methods: ['GET'])]
    public function listBookings(EntityManagerInterface $em): JsonResponse
    {
        $bookings = $em->getRepository(Booking::class)->findBy([], ['startSlot' => 'ASC']);

        return $this->json(array_map(fn(Booking $b)
            => [
            'id' => $b->getId(),
            'bookingTypeSlug' => $b->getBookingTypeSlug(),
            'startSlot' => $b->getStartSlot()->format('Y-m-d\TH:i:s\Z'),
            'visitorName' => $b->getVisitorName(),
            'visitorEmail' => $b->getVisitorEmail(),
        ], $bookings));
    }

    /**
     * Cancel a Booking.
     */
    #[Route('/bookings/{id}/cancel', methods: ['POST'])]
    public function cancelBooking(string $id, SlotService $service): JsonResponse
    {
        try {
            $service->cancelBooking($id);
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 404) {
                return $this->json(['code' => 'not_found', 'message' => $e->getMessage()], 404);
            }
            throw $e;
        }

        return new JsonResponse(null, 204);
    }
}
