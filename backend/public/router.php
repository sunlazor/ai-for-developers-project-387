<?php

/**
 * Router for the PHP built-in server used in the Docker container (ADR-0004).
 *
 * One origin serves both the React SPA and the Symfony API:
 *   - Real files under public/ (assets, calendar.svg, …) are served directly.
 *   - /api/* requests are handed to Symfony (index.php).
 *   - Every other path falls back to index.html so React Router can handle
 *     client-side routes (e.g. /host, /book/...).
 *
 * This file is only used as the built-in-server router script
 * (`php -S ... public/router.php`); it is never the production front controller.
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$publicDir = __DIR__;

// API requests go to the Symfony front controller.
if (str_starts_with($uri, '/api')) {
    require __DIR__ . '/index.php';

    return true;
}

// Serve real static files directly (false === let the built-in server handle it).
$target = realpath($publicDir . $uri);
if ($uri !== '/' && $target !== false
    && str_starts_with($target, $publicDir)
    && is_file($target)
) {
    return false;
}

// SPA fallback: hand everything else to the built React app.
$index = $publicDir . '/index.html';
if (is_file($index)) {
    header('Content-Type: text/html; charset=UTF-8');
    readfile($index);

    return true;
}

// No SPA build present — fall back to Symfony.
require __DIR__ . '/index.php';

return true;
