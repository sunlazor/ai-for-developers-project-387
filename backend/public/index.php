<?php

use App\Kernel;

// PHP built-in server doesn't propagate env vars to $_SERVER/$_ENV,
// but getenv() works. Bridge the gap so Symfony Runtime picks it up.
if (getenv('APP_ENV') && !isset($_SERVER['APP_ENV'])) {
    $_SERVER['APP_ENV'] = getenv('APP_ENV');
}
if (getenv('APP_DEBUG') && !isset($_SERVER['APP_DEBUG'])) {
    $_SERVER['APP_DEBUG'] = getenv('APP_DEBUG');
}

require_once dirname(__DIR__) . '/vendor/autoload_runtime.php';

return static function (array $context) {
    return new Kernel($context['APP_ENV'], (bool)$context['APP_DEBUG']);
};
