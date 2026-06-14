# AGENTS.md

Guidance for AI agents working in **Calendai** — a single-host appointment
scheduling site (a minimal Cal.com). One Host publishes available Slots;
anonymous Visitors book them against a Booking Type.

## Read these first

- `CONTEXT.md` — the domain model and **binding vocabulary**. Read it before
  writing any code.
- `docs/adr/` — architecture decisions. Currently:
    - ADR-0001: two distinct scheduling horizons (Host = current week + 4,
      Visitor = current week + 2; both Monday-anchored, rolling).
    - ADR-0002: all times are UTC; no per-user timezone, no local conversion.
- `main.tsp` — the API contract (see below).

## Architecture

A React SPA frontend with two interchangeable API backends: a **mocked** API
(Prism) and a **real** Symfony backend under `backend/` (see ADR-0003). Both
implement the same `main.tsp` contract.

- **Frontend**: React 18 + TypeScript + Vite. Routing via `react-router-dom`,
  data fetching via TanStack Query, forms via `react-hook-form` + `zod`.
- **UI**: shadcn/ui components (Radix primitives + Tailwind) under
  `src/components/ui`. An MCP server for shadcn is configured in `opencode.json`.
- **API contract**: defined in TypeSpec (`main.tsp`), compiled to OpenAPI
  (`tsp-output/openapi/openapi.yaml`), then served as a mock by Prism.
- **Backend**: PHP Symfony 7 under `backend/`, Doctrine + SQLite, implementing
  the `main.tsp` contract. Static Bearer token auth for Host endpoints.
- **Wiring**: Vite dev server (`:3000`) proxies `/api` → Prism mock (`:4010`)
  by default, or → Symfony (`:9000`) via `npm run dev:real`.

### Source layout

- `src/api/client.ts` — typed fetch wrapper; all endpoints live here.
- `src/types/openapi.ts` — **generated** from the OpenAPI document; do not edit.
- `src/types/booking.ts` — flat, ergonomic domain types **derived** from
  `openapi.ts` (e.g. `BookingType` instead of `components['schemas']['BookingType']`).
- `src/pages/` — `HomePage`, `BookingPage` (Visitor flow), `HostPage` (Host flow).
- `src/components/` — `Layout` + `ui/` (shadcn primitives).
- `src/lib/utils.ts` — `cn`, UTC date/time formatting, and slot-grid helpers.
- `src/hooks/` — shared hooks.
- `backend/` — Symfony 7 backend (see ADR-0003). Controllers under
  `backend/src/Controller/` map onto the `main.tsp` operations; Doctrine
  entities under `backend/src/Entity/` mirror the TypeSpec models.

## The API contract is the source of truth

`main.tsp` is authoritative for the API shape. To change any endpoint or model:

1. Edit `main.tsp`.
2. Recompile: `npm run typespec:compile` — this emits the OpenAPI document
   **and** regenerates `src/types/openapi.ts` (it chains `npm run typegen`).
3. Update `src/api/client.ts` and any callers to match.
4. If you added or renamed a model, re-export it from `src/types/booking.ts`
   (the flat domain surface derived from `openapi.ts`).

> **Type generation:** `src/types/openapi.ts` is generated from the OpenAPI
> document via `openapi-typescript` (`npm run typegen`, also run automatically
> by `typespec:compile`). It is a build artifact — **never edit it by hand**.
> `src/types/booking.ts` only re-exports those generated schemas under flat,
> ergonomic names; it carries no hand-authored shapes. To change a model, edit
> `main.tsp` and recompile.

## Running locally

The app needs **two processes** in **separate terminals**:

```sh
npm run typespec:compile   # only if main.tsp changed; regenerates the mock spec
npm run mock               # Prism mock API on :4010
npm run dev                # Vite dev server on :3000 (proxies /api → :4010)
```

To use the **real Symfony backend** instead of the Prism mock:

```sh
# Terminal 1: start Symfony on :9000
cd backend && php -S localhost:9000 -t public/

# Terminal 2: start Vite with proxy pointing at Symfony
npm run dev:real
```

As an agent, do **not** start these servers yourself unless asked — assume the
human runs them, and ask them to restart if you changed `main.tsp` or the
backend code.

### Running in Docker

The whole app (SPA + Symfony backend) also ships as a **single container**
(ADR-0004). Unlike local dev there is **no Vite proxy**: the PHP built-in server
serves the built SPA and `/api` from one origin on `$PORT`.

```sh
docker build -t calendai .
docker run -e PORT=8080 -p 8080:8080 calendai   # http://localhost:8080
```

`PORT` selects the listen port (default `8080`). Migrations run and `AppFixtures`
seeds once on first boot (`LOAD_FIXTURES=force` re-seeds, `skip` disables).

## Verification gate

Before declaring any change done, all of these must pass:

```sh
npm run lint               # ESLint — the only automated style gate
npm run build              # tsc typecheck + vite build
npm run typespec:compile   # only if main.tsp changed
npm test                   # Vitest
```

If you changed anything under `backend/`, also run the PHP gate:

```sh
cd backend
php bin/phpunit                          # PHPUnit
php bin/console doctrine:schema:validate # entities ↔ schema in sync
```

## Conventions

### Domain language (binding)

Use the exact vocabulary from `CONTEXT.md` in identifiers, comments, and **UI
copy**: **Host**, **Visitor**, **Booking Type**, **Booking**, **Slot**,
**Availability**. Do not use the forbidden synonyms listed there (e.g. user,
admin, customer, guest, appointment, event type, timeslot, schedule). The
domain rules in `CONTEXT.md` and the ADRs are binding — respect them in code.

Key invariants to honor:

- All times are **UTC** (ADR-0002). Format with `timeZone: 'UTC'`; never use
  local time. See `src/lib/utils.ts`.
- A **Slot** is fixed at 15 minutes, aligned to `:00/:15/:30/:45`.
- Booking ids are `YYYY-MM-DD-HH-MM` (UTC) derived from the start Slot.
- Respect the two horizons (ADR-0001): Visitor = current week + 2,
  Host = current week + 4.

### Code style

- ESLint is the only automated gate — keep `npm run lint` clean (zero warnings).
- Match the style of the file you are editing.
- Use the `@/` import alias for `src` (e.g. `import {api} from '@/api/client'`).

### Testing

- Vitest is the test runner (`npm test`). No tests exist yet.
- Add tests alongside changes, especially for the slot-grid and UTC date logic
  in `src/lib/utils.ts`, where correctness is easy to get subtly wrong.

## Reference docs (non-binding)

- `docs/visitor-flow.md` — current Visitor flow steps + diagram
