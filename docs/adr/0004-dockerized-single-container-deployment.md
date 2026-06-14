# Dockerized single-container deployment

Calendai can run as a single Docker container that serves both the React SPA
and the Symfony API from **one origin** on a single port. This makes the app
deployable to PaaS platforms that inject a `PORT` environment variable.

## Decision

A multi-stage `Dockerfile` (repo root) produces one runtime image:

1. **web** (`node:22-alpine`) builds the SPA with `npm run build` into `dist/`.
   `src/types/openapi.ts` is committed, so the build is self-contained and does
   not need the TypeSpec toolchain. Node 22 is required because parts of the dev
   toolchain (`@typespec/*`, `@scalar/*`) declare `node >=22`. Because
   `package-lock.json` is gitignored, the stage uses `npm ci` when a lockfile is
   present and falls back to `npm install` otherwise.
2. **php-deps** (`composer:2`) installs the Symfony production dependencies
   (`--no-dev --optimize-autoloader`).
3. **runtime** (`php:8.2-cli-alpine`) copies the backend, its `vendor/`, and the
   built SPA into `backend/public/`, then runs the **PHP built-in server**.

The built-in server is used deliberately (consistent with ADR-0003 and the
existing `dev:real` workflow) rather than nginx + php-fpm: it keeps the image
minimal and matches how the backend is already run locally. This is a
single-host demo deployment, not a high-traffic production target.

## One origin, one port

`src/api/client.ts` calls a relative `/api`. In the container there is no Vite
dev proxy, so the SPA and the API must share an origin. A router script
(`backend/public/router.php`) wired into the built-in server:

- serves real files under `public/` directly (assets, `calendar.svg`);
- routes `/api/*` to the Symfony front controller (`index.php`);
- falls back to `index.html` for any other path, so React Router handles
  client-side routes such as `/host`.

## PORT

The container listens on `$PORT` (default `8080`). `docker-entrypoint.sh` reads
it and starts `php -S 0.0.0.0:$PORT -t public public/router.php`.

## Persistence and seeding

The backend keeps using SQLite under `backend/var/` (ADR-0003). On boot the
entrypoint runs Doctrine migrations, then seeds `AppFixtures` **once** (guarded
by a `var/.seeded` marker; `LOAD_FIXTURES=force` re-seeds, `skip` disables).
Because the fixtures generate time-relative Slots, seeding happens at runtime
rather than at build time. `DoctrineFixturesBundle` is therefore enabled in
`prod` as well as `dev`/`test`.

## Environment variables

- `PORT` — port to listen on (default `8080`).
- `APP_ENV=prod`, `APP_DEBUG=0` — baked into the image.
- `HOST_API_TOKEN` — static Bearer token for Host endpoints (overridable).
- `LOAD_FIXTURES` — `force` to re-seed, `skip` to never seed (default: seed once).
