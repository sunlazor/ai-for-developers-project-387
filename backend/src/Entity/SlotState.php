<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Slot state enum mirroring the TypeSpec SlotState.
 *
 * - unavailable: default; not opened by the Host.
 * - available: opened by the Host for booking, and not yet booked.
 * - booked: occupied by a Booking.
 */
enum SlotState: string
{
    case Unavailable = 'unavailable';
    case Available = 'available';
    case Booked = 'booked';
}
