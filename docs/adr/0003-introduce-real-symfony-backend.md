# Introduce a real Symfony backend

Calendai began as a frontend-only SPA backed by a mocked API (TypeSpec → OpenAPI
→ Prism). We now introduce a real server: a PHP **Symfony 7** application under
`backend/`, persisting data in **SQLite** via Doctrine, that implements the same
contract defined in `main.tsp`.

`main.tsp` remains the source of truth for the API shape. The Symfony backend
implements that contract; it does not redefine it. The Doctrine entities mirror
the TypeSpec models (`BookingType`, `Slot`, `Booking`) and the controllers map
one-to-one onto the TypeSpec operations, returning the same error shapes
(`401/404/409/422` with `{code, message}`).

SQLite (rather than in-memory state) is chosen so Host write-flows — creating
and editing Booking Types, editing Availability, cancelling Bookings — actually
persist across requests and can be exercised end-to-end from the frontend. The
PHP built-in server does not retain in-process state reliably between requests,
which would make write-flows behave incorrectly.

Authentication uses a single static Bearer token (`HOST_API_TOKEN`). This matches
the domain model in `CONTEXT.md`: there is exactly one Host, and Visitor
endpoints are public. A full login/JWT flow would add machinery the single-host
model does not need.

During the transition the backend **coexists** with the Prism mock: Prism stays
on `:4010` (default `npm run dev`), and Symfony serves on `:9000`, reachable via
the existing `npm run dev:real` script (which already proxies `/api` → `:9000`).
This lets the mock and the real backend be compared side by side before the mock
is retired.

The binding domain rules are unchanged and respected by the backend: all times
are UTC (ADR-0002), Slots are 15 minutes aligned to `:00/:15/:30/:45`, Booking
ids are `YYYY-MM-DD-HH-MM` derived from the start Slot, and the two rolling
Monday-anchored horizons hold (Visitor = current week + 2, Host = current
week + 4; ADR-0001).
