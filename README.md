# Petty Cash Monitoring

Laravel 12 + React 19 application using Inertia, Vite, Tailwind CSS, and MySQL. The original React page and UI component files are retained.

## Setup

Requirements: PHP 8.3+, Composer, Node.js, npm, and MySQL.

1. Copy `.env.example` to `.env`; configure the app database and the `bmt-multisales` / `bmt-finance` connections.
2. Run `composer install` and `php artisan key:generate`.
3. Run `npm install`.
4. Run `php artisan migrate --seed`.
5. Run `php artisan storage:link`.
6. Start `php artisan serve` and `npm run dev` (or build assets with `npm run build`).

Login uses active accounts from `bmt-multisales.users`; passwords are checked against the bcrypt hash in its `auth` column. The configured MySQL account must be able to read that table.

## Structure and request flow

- `routes/web.php`: session-authenticated Inertia routes and named CRUD routes.
- `app/Http/Controllers`: request orchestration and Inertia responses.
- `app/Http/Requests`: server-side validation.
- `app/Services`: transactional reconciliation persistence and reference generation.
- `app/Models`: users, reconciliations, transactions, and references.
- `app/Http/Resources`: stable frontend-facing representations.
- `app/Repositories`: Eloquent query and eager-loading boundaries.
- `database/migrations`, `database/factories`, `database/seeders`: app schema and initial reference/reconciliation data.
- `app/Policies`: authorization for reconciliation and reference CRUD actions.
- `src/pages`, `src/components`: existing React pages and UI components.
- `resources/js/Services/api.ts`: Axios instance for JSON endpoints.

Browser request → web/session/CSRF middleware → controller → Form Request → service/model → MySQL → Inertia page props or redirect.

## Routes

| Method | Path | Name | Middleware |
| --- | --- | --- | --- |
| GET | `/login` | `login` | guest |
| POST | `/login` | `login.store` | guest, throttle |
| POST | `/logout` | `logout` | auth |
| GET | `/dashboard` | `dashboard` | auth |
| GET/POST | `/rekonsiliasi` | `reconciliations.index/store` | auth |
| GET | `/rekonsiliasi/{reconciliation}` | `reconciliations.show` | auth |
| PUT | `/rekonsiliasi/{reconciliation}/transactions` | `reconciliations.transactions` | auth |
| DELETE | `/rekonsiliasi/{reconciliation}` | `reconciliations.destroy` | auth |
| GET/POST/DELETE | `/referensi` and `/referensi/{reference}` | `references.index/store/destroy` | auth |

## Database relations

`reconciliations` has many `transactions`; deleting a reconciliation cascades to its transactions. Reference codes are unique. Reconciliation period (`year`, `month`) is unique.

Migrations create users, cache and locks, reconciliations, transactions, references, and sessions.

| Migration | Tables |
| --- | --- |
| `0001_01_01_000000` | `users` |
| `0001_01_01_000001` | `cache`, `cache_locks` |
| `2026_11_10_000001` | `reconciliations` |
| `2026_11_10_000002` | `transactions` |
| `2026_11_10_000003` | `references` |
| `2026_11_10_000004` | `sessions` |

Migrations create users, cache/locks, reconciliations, transactions, references, and sessions.

## Artisan commands

- `php artisan migrate --seed` — create the app schema and seed initial reference/reconciliation data.
- `php artisan storage:link` — expose uploaded files through Laravel's public storage disk.
- `php artisan route:list` — inspect registered routes and middleware.
- `php artisan migrate:fresh --seed` — rebuild the local database.

## Configuration

Set `APP_KEY`, `APP_URL`, `DB_*`, `DB_MULTISALES_*`, `DB_FINANCE_*`, `SESSION_*`, and `FILESYSTEM_DISK` in `.env`. Uploaded statement originals are written to `storage/app/public/reconciliations`.

## Current migration note

Excel workbook decoding currently uses the existing BCA workbook parser in the browser to preserve its format handling. The uploaded file and parsed transactions are then saved together through Laravel's validated reconciliation service.
