#!/bin/sh
set -e

# Entrypoint for the Calendai single container (ADR-0004).
# Prepares the SQLite database, then starts the PHP built-in server which
# serves both the React SPA and the Symfony /api on $PORT.

PORT="${PORT:-8080}"

cd /app/backend

# var/ must be writable for the SQLite db and cache.
mkdir -p var
chmod -R 777 var || true

# Create / update the schema.
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

# Seed once. The fixtures generate time-relative Slots, so we seed on first
# boot only (a marker file makes this idempotent across restarts). Set
# LOAD_FIXTURES=force to re-seed (purges existing data).
SEED_MARKER="var/.seeded"
if [ "${LOAD_FIXTURES}" = "force" ]; then
    php bin/console doctrine:fixtures:load --no-interaction
    touch "${SEED_MARKER}"
elif [ "${LOAD_FIXTURES}" != "skip" ] && [ ! -f "${SEED_MARKER}" ]; then
    php bin/console doctrine:fixtures:load --no-interaction
    touch "${SEED_MARKER}"
fi

# Warm the prod cache.
php bin/console cache:warmup

echo "Calendai listening on 0.0.0.0:${PORT}"
exec php -S "0.0.0.0:${PORT}" -t public public/router.php
