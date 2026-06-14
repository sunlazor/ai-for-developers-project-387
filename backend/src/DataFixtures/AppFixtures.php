<?php

declare(strict_types=1);

namespace App\DataFixtures;

use App\Entity\BookingType;
use App\Entity\Slot;
use App\Entity\SlotState;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

/**
 * Seed the database with data matching the openapi.yaml examples.
 *
 * All times are UTC. Slots align to :00/:15/:30/:45 boundaries.
 * Horizon: Host = current week + 4, Visitor = current week + 2 (ADR-0001).
 */
class AppFixtures extends Fixture
{
    /** @var array<string, Slot> Slots keyed by start ISO string */
    private array $slotMap = [];

    public function load(ObjectManager $manager): void
    {
        $this->seedBookingTypes($manager);
        $this->seedSlots($manager);

        $manager->flush();
    }

    private function seedBookingTypes(ObjectManager $manager): void
    {
        $types = [
            ['intro-call', 'Intro Call', 'A quick 30-minute introductory call to discuss your needs.', 2, true],
            ['deep-dive', 'Deep Dive Session', 'A 60-minute deep dive into your project requirements.', 4, true],
            ['quick-chat', 'Quick Chat', 'A brief 15-minute chat for quick questions.', 1, true],
            ['workshop', 'Workshop', 'A 90-minute hands-on workshop session.', 6, false],
        ];

        foreach ($types as [$slug, $title, $desc, $dur, $active]) {
            $bt = new BookingType($slug, $title, $desc, $dur, $active);
            $manager->persist($bt);
        }
    }

    private function seedSlots(ObjectManager $manager): void
    {
        $utc = new \DateTimeZone('UTC');

        // Generate slots across the Host horizon: current week + 4 weeks (ADR-0001).
        $now = new \DateTimeImmutable('now', $utc);
        $day = (int)$now->format('w'); // 0=Sun, 1=Mon
        $diff = $day === 0 ? -6 : 1 - $day;
        $monday = $now->modify("{$diff} days")->setTime(0, 0, 0, 0);

        // Host horizon: 5 full weeks (current week + 4)
        $horizonEnd = $monday->modify('+35 days')->modify('-1 second');

        // Generate every 15-minute slot in the horizon as unavailable.
        $cursor = $monday;
        while ($cursor <= $horizonEnd) {
            $slot = new Slot($cursor, SlotState::Unavailable);
            $manager->persist($slot);
            $this->slotMap[$cursor->format('Y-m-d\TH:i:s')] = $slot;
            $cursor = $cursor->modify('+15 minutes');
        }

        // Open a block of 4 consecutive slots at 09:00 UTC for the next 7 days
        // (starting tomorrow), so every active Booking Type — including the
        // 60-minute "Deep Dive Session" (4 slots) — can be booked.
        $dayCursor = new \DateTimeImmutable('tomorrow midnight', $utc);
        for ($i = 0; $i < 7; $i++) {
            for ($s = 0; $s < 4; $s++) {
                $key = $dayCursor->setTime(9, $s * 15)->format('Y-m-d\TH:i:s');
                if (isset($this->slotMap[$key])) {
                    $this->slotMap[$key]->setState(SlotState::Available);
                }
            }
            $dayCursor = $dayCursor->modify('+1 day');
        }
    }
}
