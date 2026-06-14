# Calendai

A single-host appointment scheduling site (a minimal Cal.com). One host
publishes the times they are available; visitors book those times against a
predefined booking type.

## Language

**Host**:
The single owner of the calendar, who is also the site administrator. The only
authenticated user.
_Avoid_: user, admin, owner

**Visitor**:
An anonymous person who books time with the Host. Has no account and does not
log in, but supplies a name and email when creating a Booking.
_Avoid_: customer, client, guest, booker

**Booking Type**:
A reusable template the Host defines, describing one kind of bookable meeting.
Has a title, description, and duration. Not tied to any specific date or time.
_Avoid_: event type, appointment type

**Booking**:
A concrete reservation a Visitor makes against a Booking Type at a specific date
and time. Carries the Visitor's name and email.
_Avoid_: appointment, scheduled event, event

**Slot**:
The smallest unit of time, fixed at 15 minutes. A day is divided into a fixed
grid of slots, four per hour. A Slot is *unavailable* by default, *available*
when the Host opens it for booking, or *booked* when a Booking occupies it.
_Avoid_: timeslot, interval, period

**Phantom Slot**:
A Slot that appears in the Host's management view but does not yet exist in the
database. Every 15-minute slot of a day is shown to the Host; ones without a
corresponding record are phantom slots, rendered as unavailable. Clicking a
phantom slot creates it as available in the database.
_Avoid_: placeholder slot, virtual slot, ghost slot

**Availability**:
The set of Slots the Host has opened for booking. A Booking can only be placed
on Slots that are available and not already booked.
_Avoid_: schedule, free time, openings
