<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Booking;
use App\Entity\Slot;
use App\Entity\SlotState;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Core slot-grid and availability logic. Ported from src/lib/utils.ts
 * and the domain rules in CONTEXT.md + ADR-0001/0002.
 *
 * All times UTC. Slots are 15 minutes, aligned to :00/:15/:30/:45.
 * Visitor horizon: current week + 2 (Monday-anchored, rolling).
 * Host horizon: current week + 4 (Monday-anchored, rolling).
 */
class SlotService
{
    private const SLOT_MINUTES = 15;
    private const VISITOR_WEEKS = 2;
    private const HOST_WEEKS = 4;

    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * Return the Monday (00:00:00 UTC) of the current week.
     */
    public function currentWeekMonday(\DateTimeImmutable $now = new \DateTimeImmutable()): \DateTimeImmutable
    {
        $utc = new \DateTimeZone('UTC');
        $now = $now->setTimezone($utc);
        $day = (int)$now->format('w'); // 0=Sun, 1=Mon, ..., 6=Sat
        $diff = $day === 0 ? -6 : 1 - $day;

        return $now->modify("{$diff} days")->setTime(0, 0, 0, 0);
    }

    /**
     * Visitor horizon end: the Sunday of (current week + 2 weeks), 23:59:59 UTC.
     */
    public function visitorHorizonEnd(\DateTimeImmutable $now = new \DateTimeImmutable()): \DateTimeImmutable
    {
        $monday = $this->currentWeekMonday($now);

        return $monday
            ->modify('+' . (self::VISITOR_WEEKS * 7) . ' days')
            ->modify('+6 days')
            ->setTime(23, 59, 59, 0);
    }

    /**
     * Host horizon end: the Sunday of (current week + 4 weeks), 23:59:59 UTC.
     */
    public function hostHorizonEnd(\DateTimeImmutable $now = new \DateTimeImmutable()): \DateTimeImmutable
    {
        $monday = $this->currentWeekMonday($now);

        return $monday
            ->modify('+' . (self::HOST_WEEKS * 7) . ' days')
            ->modify('+6 days')
            ->setTime(23, 59, 59, 0);
    }

    /**
     * Check whether a datetime aligns to a 15-minute boundary (:00/:15/:30/:45).
     */
    public static function isAligned(\DateTimeImmutable $dt): bool
    {
        return ((int)$dt->format('i')) % self::SLOT_MINUTES === 0;
    }

    /**
     * Derive a Booking id from a start Slot datetime.
     * Format: YYYY-MM-DD-HH-MM (UTC).
     */
    public static function deriveBookingId(\DateTimeImmutable $startSlot): string
    {
        return $startSlot
            ->setTimezone(new \DateTimeZone('UTC'))
            ->format('Y-m-d-H-i');
    }

    /**
     * All Slots with their state within the Host horizon, ordered by start.
     *
     * @return array<array{start: string, state: string}>
     */
    public function getHostAvailability(\DateTimeImmutable $now = new \DateTimeImmutable()): array
    {
        $horizonEnd = $this->hostHorizonEnd($now);
        $slots = $this->em
            ->getRepository(Slot::class)->createQueryBuilder('s')
            ->where('s.start >= :now')
            ->andWhere('s.start <= :horizonEnd')
            ->setParameter('now', $now->setTimezone(new \DateTimeZone('UTC')))
            ->setParameter('horizonEnd', $horizonEnd)
            ->orderBy('s.start', 'ASC')
            ->getQuery()
            ->getResult();

        return array_map(fn(Slot $s)
            => [
            'start' => $s->getStart()->format('Y-m-d\TH:i:s\Z'),
            'state' => $s->getState()->value,
        ], $slots);
    }

    /**
     * Available and unbooked Slots within the Visitor horizon, ordered by start.
     *
     * @return array<array{start: string}>
     */
    public function getVisitorAvailability(\DateTimeImmutable $now = new \DateTimeImmutable()): array
    {
        $horizonEnd = $this->visitorHorizonEnd($now);
        $slots = $this->em
            ->getRepository(Slot::class)->createQueryBuilder('s')
            ->where('s.start >= :now')
            ->andWhere('s.start <= :horizonEnd')
            ->andWhere('s.state = :state')
            ->setParameter('now', $now->setTimezone(new \DateTimeZone('UTC')))
            ->setParameter('horizonEnd', $horizonEnd)
            ->setParameter('state', SlotState::Available)
            ->orderBy('s.start', 'ASC')
            ->getQuery()
            ->getResult();

        return array_map(fn(Slot $s)
            => [
            'start' => $s->getStart()->format('Y-m-d\TH:i:s\Z'),
        ], $slots);
    }

    /**
     * Create a Booking: validate all rules, mark slots booked, persist.
     *
     * Rules enforced:
     * - startSlot must align to :00/:15/:30/:45
     * - durationSlots consecutive slots must all exist, be `available`, and within the Visitor horizon
     * - First valid request wins (409 on conflict)
     *
     * @throws \RuntimeException 422 if rules violated
     * @throws \RuntimeException 409 if slots no longer available
     */
    public function createBooking(
        string $bookingTypeSlug,
        \DateTimeImmutable $startSlot,
        string $visitorName,
        string $visitorEmail,
        int $durationSlots,
    ): Booking {
        $utc = new \DateTimeZone('UTC');
        $startSlot = $startSlot->setTimezone($utc);

        // Rule: must align to 15-minute boundary
        if (!self::isAligned($startSlot)) {
            throw new \RuntimeException('Start slot is not aligned to a 15-minute boundary.', 422);
        }

        // Rule: must be within Visitor horizon
        $visitorEnd = $this->visitorHorizonEnd();
        $endSlot = $startSlot->modify('+' . ($durationSlots * self::SLOT_MINUTES) . ' minutes');
        if ($endSlot > $visitorEnd) {
            throw new \RuntimeException('Booking extends beyond the Visitor horizon.', 422);
        }

        // Rule: start must not be in the past
        $now = new \DateTimeImmutable('now', $utc);
        if ($startSlot < $now) {
            throw new \RuntimeException('Cannot book a slot in the past.', 422);
        }

        // Find and validate all consecutive slots
        $slotsToBook = [];
        $cursor = $startSlot;
        for ($i = 0; $i < $durationSlots; $i++) {
            $slot = $this->em->getRepository(Slot::class)->findOneBy(['start' => $cursor]);
            if ($slot === null || $slot->getState() !== SlotState::Available) {
                throw new \RuntimeException(
                    'One or more required slots are not available.',
                    409,
                );
            }
            $slotsToBook[] = $slot;
            $cursor = $cursor->modify('+' . self::SLOT_MINUTES . ' minutes');
        }

        // Mark slots as booked
        foreach ($slotsToBook as $slot) {
            $slot->setState(SlotState::Booked);
        }

        // Create the Booking entity
        $bookingId = self::deriveBookingId($startSlot);
        $booking = new Booking($bookingId, $bookingTypeSlug, $startSlot, $visitorName, $visitorEmail);
        $this->em->persist($booking);
        $this->em->flush();

        return $booking;
    }

    /**
     * Cancel a Booking. Its Slots return to `available` so the Host can
     * manage them immediately without manual re-opening.
     *
     * @throws \RuntimeException 404 if booking not found
     */
    public function cancelBooking(string $bookingId): void
    {
        $booking = $this->em->getRepository(Booking::class)->find($bookingId);
        if ($booking === null) {
            throw new \RuntimeException('Booking not found.', 404);
        }

        $bookingTypeRepo = $this->em->getRepository(\App\Entity\BookingType::class);
        $bookingType = $bookingTypeRepo->find($booking->getBookingTypeSlug());

        if ($bookingType === null) {
            $durationSlots = 1;
        } else {
            $durationSlots = $bookingType->getDurationSlots();
        }

        $utc = new \DateTimeZone('UTC');
        $cursor = $booking->getStartSlot()->setTimezone($utc);
        for ($i = 0; $i < $durationSlots; $i++) {
            $slot = $this->em->getRepository(Slot::class)->findOneBy(['start' => $cursor]);
            if ($slot !== null && $slot->getState() === SlotState::Booked) {
                $slot->setState(SlotState::Available);
            }
            $cursor = $cursor->modify('+' . self::SLOT_MINUTES . ' minutes');
        }

        $this->em->remove($booking);
        $this->em->flush();
    }
}
