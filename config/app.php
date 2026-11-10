<?php

return [
    'name' => env('APP_NAME', 'Petty Cash Monitoring'), 'env' => env('APP_ENV', 'production'), 'debug' => (bool) env('APP_DEBUG', false), 'url' => env('APP_URL', 'http://localhost'), 'timezone' => 'Asia/Jakarta',
    'locale' => env('APP_LOCALE', 'id'), 'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'), 'faker_locale' => env('APP_FAKER_LOCALE', 'id_ID'), 'key' => env('APP_KEY'), 'cipher' => 'AES-256-CBC',
    'maintenance' => ['driver' => env('APP_MAINTENANCE_DRIVER', 'file'), 'store' => env('APP_MAINTENANCE_STORE', 'database')],
];
