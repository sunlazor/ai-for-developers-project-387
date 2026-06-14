# Calendai — single container: React SPA + Symfony backend on one origin (ADR-0004).
# The PHP built-in server serves the built SPA and the /api endpoints on $PORT.

# ---------------------------------------------------------------------------
# Stage 1: build the React SPA -> dist/
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web

WORKDIR /app

# package-lock.json is gitignored, so it may be absent in a clean checkout.
# Use `npm ci` when a lockfile is present, otherwise fall back to `npm install`.
COPY package.json ./
COPY package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Sources needed for the typecheck + Vite build.
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY postcss.config.js tailwind.config.js ./
COPY src ./src

# src/types/openapi.ts is committed, so the build is self-contained.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: install Symfony (prod) dependencies
# ---------------------------------------------------------------------------
FROM composer:2 AS php-deps

WORKDIR /app/backend

ENV APP_ENV=prod
COPY backend/composer.json backend/composer.lock backend/symfony.lock ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction \
    --prefer-dist

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM php:8.2-cli AS runtime

# pdo_sqlite for the database; ctype/iconv are required by Symfony.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-dev \
    libicu-dev \
    libxslt1-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libsodium-dev \
    libzip-dev \
    libcurl4-openssl-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo pdo_sqlite intl xsl gd sodium zip curl \
    && rm -rf /var/lib/apt/lists/*

ENV APP_ENV=prod \
    APP_DEBUG=0 \
    PORT=8080

WORKDIR /app

# Backend source + vendored deps.
COPY backend /app/backend
COPY --from=php-deps /app/backend/vendor /app/backend/vendor

# Built SPA into the public dir so the built-in server can serve it.
COPY --from=web /app/dist /app/backend/public

# Router + entrypoint.
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh \
    && mkdir -p /app/backend/var \
    && chmod -R 777 /app/backend/var

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
