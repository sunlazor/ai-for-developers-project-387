import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

/**
 * Calendai — a single-host appointment scheduling site (a minimal Cal.com).
 *
 * One Host publishes the Slots they are available; anonymous Visitors book those
 * Slots against a predefined Booking Type.
 *
 * Conventions:
 * - All times are UTC. There is no per-user timezone (see ADR-0002).
 * - A Slot is fixed at 15 minutes; slot start times always align to :00/:15/:30/:45.
 * - The Visitor horizon is the current week + 2 (Monday-anchored, rolling).
 * - The Host horizon is the current week + 4 (Monday-anchored, rolling).
 *   (see ADR-0001)
 */
@service(#{ title: "Calendai" })
@server("https://api.calendai.example", "Calendai API")
namespace Calendai;

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

/**
 * Returned by Host-only endpoints when the Bearer token is missing or invalid.
 * There is exactly one Host; Visitor endpoints are public.
 */
@error
model Unauthorized {
  @statusCode statusCode: 401;
  code: "unauthorized";
  message: string;
}

// ---------------------------------------------------------------------------
// Shared scalars & error shapes
// ---------------------------------------------------------------------------

/**
 * The UTC start instant of a Slot, ISO 8601, aligned to a 15-minute boundary
 * (e.g. `2026-06-12T10:15:00Z`).
 */
scalar SlotStart extends utcDateTime;

/**
 * Booking Type identifier: a URL-friendly slug. Unique and immutable.
 */
scalar Slug extends string;

/**
 * Booking identifier derived from the start Slot, formatted `YYYY-MM-DD-HH-MM`
 * in UTC (e.g. `2026-06-12-10-15`). A start Slot uniquely identifies a Booking.
 */
scalar BookingId extends string;

@error
model NotFound {
  @statusCode statusCode: 404;
  code: "not_found";
  message: string;
}

/** A rule violation: malformed request against the domain rules. */
@error
model Unprocessable {
  @statusCode statusCode: 422;
  code: "unprocessable";
  message: string;
}

/**
 * The requested Slots are no longer all available/unbooked (taken by another
 * Booking, or closed by the Host). First valid request wins.
 */
@error
model Conflict {
  @statusCode statusCode: 409;
  code: "conflict";
  message: string;
}

// ---------------------------------------------------------------------------
// Booking Type
// ---------------------------------------------------------------------------

/**
 * A reusable template the Host defines, describing one kind of bookable meeting.
 * Not tied to any specific date or time.
 */
@example(#{ slug: "intro-call", title: "Intro Call", description: "A quick 30-minute introductory call to discuss your needs.", durationSlots: 2, active: true })
@example(#{ slug: "deep-dive", title: "Deep Dive Session", description: "A 60-minute deep dive into your project requirements.", durationSlots: 4, active: true })
@example(#{ slug: "quick-chat", title: "Quick Chat", description: "A brief 15-minute chat for quick questions.", durationSlots: 1, active: true })
@example(#{ slug: "workshop", title: "Workshop", description: "A 90-minute hands-on workshop session.", durationSlots: 6, active: false })
model BookingType {
  /** URL-friendly slug. Unique and immutable; serves as the identifier. */
  @key slug: Slug;

  title: string;
  description: string;

  /** Duration in Slots (15 minutes each). Immutable once created. */
  @minValue(1)
  durationSlots: int32;

  /** Deactivated Booking Types are hidden from new Bookings but retained. */
  active: boolean;
}

model CreateBookingType {
  slug: Slug;
  title: string;
  description: string;

  @minValue(1)
  durationSlots: int32;
}

/** Only title and description are editable; slug and duration are immutable. */
model UpdateBookingType {
  title?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Slot / Availability
// ---------------------------------------------------------------------------

enum SlotState {
  /** Default. Not opened by the Host. */
  unavailable,

  /** Opened by the Host for booking, and not yet booked. */
  available,

  /** Occupied by a Booking. */
  booked,
}

/** A Slot the Visitor may book: available and unbooked. */
model AvailableSlot {
  start: SlotStart;
}

/** A Slot with its full state, as seen by the Host. */
model HostSlot {
  start: SlotStart;
  state: SlotState;
}

/**
 * A bulk edit of the Host's availability. Each entry opens (`available`) or
 * closes (`unavailable`) a Slot. A `booked` Slot cannot be edited here — the
 * Host must cancel its Booking first.
 */
model AvailabilityEdit {
  start: SlotStart;

  /** Target state: `available` to open, `unavailable` to close. */
  state: "available" | "unavailable";
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

/**
 * A concrete reservation a Visitor makes against a Booking Type at a specific
 * date and time. Occupies `durationSlots` consecutive Slots from `startSlot`.
 */
model Booking {
  /** `YYYY-MM-DD-HH-MM` of the start Slot (UTC). */
  @key id: BookingId;

  bookingTypeSlug: Slug;
  startSlot: SlotStart;

  visitorName: string;

  @format("email")
  visitorEmail: string;
}

model CreateBooking {
  bookingTypeSlug: Slug;
  startSlot: SlotStart;

  visitorName: string;

  @format("email")
  visitorEmail: string;
}

// ---------------------------------------------------------------------------
// Public (Visitor) endpoints
// ---------------------------------------------------------------------------

/** Public endpoints. No authentication required. */
@route("/api")
namespace Public {
  /** List active Booking Types. */
  @route("/booking-types")
  @get
  op listBookingTypes(): BookingType[];

  /**
   * The raw set of bookable Slots (available and unbooked) within the Visitor
   * horizon. The range is implied by the public caller.
   */
  @route("/availability")
  @get
  op getAvailability(): AvailableSlot[];

  /**
   * Create a Booking. The server verifies that `durationSlots` consecutive
   * Slots from `startSlot` are all available and unbooked, and within the
   * Visitor horizon. First valid request wins.
   */
  @route("/bookings")
  @post
  op createBooking(@body body: CreateBooking):
    | {
        @statusCode statusCode: 201;
        @body booking: Booking;
      }
    | NotFound // unknown Booking Type slug
    | Unprocessable // off-grid, beyond horizon, deactivated type, bad email
    | Conflict; // slots no longer available
}

// ---------------------------------------------------------------------------
// Host endpoints (Bearer auth)
// ---------------------------------------------------------------------------

/** Host-only endpoints. Require Bearer authentication. */
@useAuth(BearerAuth)
@route("/api/host")
namespace HostApi {
  // --- Booking Types ---

  @route("/booking-types")
  @post
  op createBookingType(@body body: CreateBookingType):
    | {
        @statusCode statusCode: 201;
        @body bookingType: BookingType;
      }
    | Unprocessable // duplicate slug, invalid duration
    | Unauthorized;

  @route("/booking-types/{slug}")
  @patch
  op updateBookingType(@path slug: Slug, @body body: UpdateBookingType):
    | BookingType
    | NotFound
    | Unauthorized;

  @route("/booking-types/{slug}/deactivate")
  @post
  op deactivateBookingType(@path slug: Slug):
    | BookingType
    | NotFound
    | Unauthorized;

  @route("/booking-types/{slug}/activate")
  @post
  op activateBookingType(@path slug: Slug):
    | BookingType
    | NotFound
    | Unauthorized;

  /** List all Booking Types (including inactive), for the Host Dashboard. */
  @route("/booking-types")
  @get
  op listAllBookingTypes(): BookingType[] | Unauthorized;

  // --- Availability ---

  /** All Slots with their state within the Host horizon. */
  @route("/availability")
  @get
  op getHostAvailability(): HostSlot[] | Unauthorized;

  /**
   * Bulk open/close Slots. Editing a `booked` Slot is rejected; the Host must
   * cancel its Booking first.
   */
  @route("/availability")
  @put
  op editAvailability(@body body: AvailabilityEdit[]):
    | HostSlot[]
    | Unprocessable // attempt to edit a booked slot, off-grid, beyond horizon
    | Unauthorized;

  // --- Bookings ---

  /** List scheduled Bookings. */
  @route("/bookings")
  @get
  op listBookings(): Booking[] | Unauthorized;

  /**
   * Cancel a Booking. Its Slots return to `available` so the Host can
   * manage them immediately without manual re-opening.
   */
  @route("/bookings/{id}/cancel")
  @post
  op cancelBooking(@path id: BookingId):
    | {
        @statusCode statusCode: 204;
      }
    | NotFound
    | Unauthorized;
}
