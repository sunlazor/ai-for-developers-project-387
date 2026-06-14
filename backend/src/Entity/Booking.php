<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BookingRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * A concrete reservation a Visitor makes against a Booking Type at a specific
 * date and time. Occupies `durationSlots` consecutive Slots from `startSlot`.
 *
 * id: YYYY-MM-DD-HH-MM of the start Slot (UTC). Derived from the start Slot.
 * bookingTypeSlug: FK to BookingType (slug).
 * startSlot: The UTC start instant of the first Slot.
 * visitorName: The Visitor's name.
 * visitorEmail: The Visitor's email.
 */
#[ORM\Entity(repositoryClass: BookingRepository::class)]
#[ORM\Table(name: 'booking')]
class Booking
{
    #[ORM\Id]
    #[ORM\Column(length: 255)]
    private string $id;

    #[ORM\Column(length: 255)]
    private string $bookingTypeSlug;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $startSlot;

    #[ORM\Column(length: 255)]
    private string $visitorName;

    #[ORM\Column(length: 255)]
    private string $visitorEmail;

    public function __construct(
        string $id,
        string $bookingTypeSlug,
        \DateTimeImmutable $startSlot,
        string $visitorName,
        string $visitorEmail,
    ) {
        $this->id = $id;
        $this->bookingTypeSlug = $bookingTypeSlug;
        $this->startSlot = $startSlot;
        $this->visitorName = $visitorName;
        $this->visitorEmail = $visitorEmail;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getBookingTypeSlug(): string
    {
        return $this->bookingTypeSlug;
    }

    public function getStartSlot(): \DateTimeImmutable
    {
        return $this->startSlot;
    }

    public function getVisitorName(): string
    {
        return $this->visitorName;
    }

    public function getVisitorEmail(): string
    {
        return $this->visitorEmail;
    }

    /**
     * Derive a Booking id from a start Slot datetime.
     * Format: YYYY-MM-DD-HH-MM (UTC).
     */
    public static function deriveId(\DateTimeImmutable $startSlot): string
    {
        return $startSlot->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d-H-i');
    }
}
