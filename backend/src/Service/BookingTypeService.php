<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BookingType;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Booking Type CRUD operations.
 *
 * Slug and durationSlots are immutable once created.
 * Only title and description are editable.
 */
class BookingTypeService
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    /**
     * List all active Booking Types.
     *
     * @return BookingType[]
     */
    public function listActive(): array
    {
        return $this->em
            ->getRepository(BookingType::class)
            ->createQueryBuilder('bt')
            ->where('bt.active = :active')
            ->setParameter('active', true)
            ->orderBy('bt.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * List all Booking Types (including inactive), ordered by title.
     *
     * @return BookingType[]
     */
    public function listAll(): array
    {
        return $this->em
            ->getRepository(BookingType::class)
            ->createQueryBuilder('bt')
            ->orderBy('bt.title', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find a Booking Type by slug (regardless of active state).
     */
    public function find(string $slug): ?BookingType
    {
        return $this->em->getRepository(BookingType::class)->find($slug);
    }

    /**
     * Create a new Booking Type.
     *
     * @throws \RuntimeException 422 if slug already exists or durationSlots < 1
     */
    public function create(string $slug, string $title, string $description, int $durationSlots): BookingType
    {
        if ($durationSlots < 1) {
            throw new \RuntimeException('Duration must be at least 1 slot.', 422);
        }

        $existing = $this->em->getRepository(BookingType::class)->find($slug);
        if ($existing !== null) {
            throw new \RuntimeException('Booking Type with this slug already exists.', 422);
        }

        $bt = new BookingType($slug, $title, $description, $durationSlots, true);
        $this->em->persist($bt);
        $this->em->flush();

        return $bt;
    }

    /**
     * Update a Booking Type (title and/or description only).
     *
     * @throws \RuntimeException 404 if not found
     */
    public function update(string $slug, ?string $title, ?string $description): BookingType
    {
        $bt = $this->em->getRepository(BookingType::class)->find($slug);
        if ($bt === null) {
            throw new \RuntimeException('Booking Type not found.', 404);
        }

        if ($title !== null) {
            $bt->setTitle($title);
        }
        if ($description !== null) {
            $bt->setDescription($description);
        }

        $this->em->flush();
        return $bt;
    }

    /**
     * Deactivate a Booking Type (hide from new bookings but retain).
     *
     * @throws \RuntimeException 404 if not found
     */
    public function deactivate(string $slug): BookingType
    {
        $bt = $this->em->getRepository(BookingType::class)->find($slug);
        if ($bt === null) {
            throw new \RuntimeException('Booking Type not found.', 404);
        }

        $bt->setActive(false);
        $this->em->flush();
        return $bt;
    }

    /**
     * Activate a previously deactivated Booking Type.
     *
     * @throws \RuntimeException 404 if not found
     */
    public function activate(string $slug): BookingType
    {
        $bt = $this->em->getRepository(BookingType::class)->find($slug);
        if ($bt === null) {
            throw new \RuntimeException('Booking Type not found.', 404);
        }

        $bt->setActive(true);
        $this->em->flush();
        return $bt;
    }
}
