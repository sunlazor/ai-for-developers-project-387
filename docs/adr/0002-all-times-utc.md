# All times fixed to UTC

Every Slot, Booking start time, and Booking id is expressed in UTC. There is no
per-Host or per-Visitor timezone and no local-time conversion.

UTC has no daylight saving time, so it sidesteps the seasonal time-change hazards
that plague civil timezones: no skipped hours (spring forward), no repeated hours
(fall back), and every `YYYY-MM-DD-HH-MM` maps to exactly one real instant. This
keeps the timestamp-based Booking id collision-free and the slot grid unambiguous.

Consequence: the Host and Visitors see UTC wall-clock times, not their own local
time. This is an accepted simplification for a single-host minimal site.
