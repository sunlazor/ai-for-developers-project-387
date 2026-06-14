<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SlotRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * The smallest unit of time, fixed at 15 minutes. A day is divided into a fixed
 * grid of slots, four per hour.
 *
 * id: auto-generated integer PK.
 * start: The UTC start instant, ISO 8601, aligned to :00/:15/:30/:45. Unique.
 * state: unavailable (default) | available (opened by Host) | booked (occupied).
 */
#[ORM\Entity(repositoryClass: SlotRepository::class)]
#[ORM\Table(name: 'slot')]
#[ORM\UniqueConstraint(name: 'uniq_slot_start', columns: ['start'])]
class Slot
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $start;

    #[ORM\Column(type: 'string', enumType: SlotState::class)]
    private SlotState $state;

    public function __construct(\DateTimeImmutable $start, SlotState $state = SlotState::Unavailable)
    {
        $this->start = $start;
        $this->state = $state;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getStart(): \DateTimeImmutable
    {
        return $this->start;
    }

    public function getState(): SlotState
    {
        return $this->state;
    }

    public function setState(SlotState $state): void
    {
        $this->state = $state;
    }
}
