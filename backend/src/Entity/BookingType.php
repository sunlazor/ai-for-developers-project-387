<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BookingTypeRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * A reusable template the Host defines, describing one kind of bookable meeting.
 * Not tied to any specific date or time.
 *
 * slug (PK): URL-friendly slug. Unique and immutable; serves as the identifier.
 * durationSlots: Duration in Slots (15 minutes each). Immutable once created.
 * active: Deactivated Booking Types are hidden from new Bookings but retained.
 */
#[ORM\Entity(repositoryClass: BookingTypeRepository::class)]
#[ORM\Table(name: 'booking_type')]
class BookingType
{
    #[ORM\Id]
    #[ORM\Column(length: 255)]
    private string $slug;

    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\Column(type: 'text')]
    private string $description;

    #[ORM\Column(type: 'integer')]
    private int $durationSlots;

    #[ORM\Column(type: 'boolean')]
    private bool $active;

    public function __construct(
        string $slug,
        string $title,
        string $description,
        int $durationSlots,
        bool $active = true,
    ) {
        $this->slug = $slug;
        $this->title = $title;
        $this->description = $description;
        $this->durationSlots = $durationSlots;
        $this->active = $active;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): void
    {
        $this->title = $title;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function setDescription(string $description): void
    {
        $this->description = $description;
    }

    public function getDurationSlots(): int
    {
        return $this->durationSlots;
    }

    public function isActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): void
    {
        $this->active = $active;
    }
}
