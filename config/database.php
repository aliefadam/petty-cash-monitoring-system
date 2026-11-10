<?php

$mysqlConnection = static fn (string $prefix, string $defaultDatabase): array => [
    'driver' => 'mysql',
    'url' => env($prefix . '_URL', env('DB_URL')),
    'host' => env($prefix . '_HOST', env('DB_HOST', '127.0.0.1')),
    'port' => env($prefix . '_PORT', env('DB_PORT', '3306')),
    'database' => env($prefix . '_DATABASE', $defaultDatabase),
    'username' => env($prefix . '_USERNAME', env('DB_USERNAME', 'root')),
    'password' => env($prefix . '_PASSWORD', env('DB_PASSWORD', '')),
    'unix_socket' => env($prefix . '_SOCKET', env('DB_SOCKET', '')),
    'charset' => env('DB_CHARSET', 'utf8mb4'),
    'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
    'prefix' => '',
    'prefix_indexes' => true,
    'strict' => true,
    'engine' => null,
    'options' => extension_loaded('pdo_mysql') ? array_filter([PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA')]) : [],
];

return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'connections' => [
        'mysql' => $mysqlConnection('DB', 'laravel'),
        'bmt_multisales' => $mysqlConnection('DB_MULTISALES', 'bmt-multisales'),
        'bmt_finance' => $mysqlConnection('DB_FINANCE', 'bmt-finance'),
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
    'redis' => ['client' => env('REDIS_CLIENT', 'phpredis'), 'options' => ['cluster' => env('REDIS_CLUSTER', 'redis'), 'prefix' => env('REDIS_PREFIX', 'petty_cash_database_')]],
];
