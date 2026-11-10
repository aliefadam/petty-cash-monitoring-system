REACT -> LARAVEL

# MIGRASI PROJECT KE LARAVEL 12 + REACT

## Tujuan

Lakukan migrasi penuh project yang saat ini menggunakan tech stack lama menjadi **Laravel 12 + React + Inertia.js + Vite + Tailwind CSS** tanpa mengurangi fitur yang telah ada.

Target utama adalah menghasilkan project yang:

- Clean
- Modular
- Scalable
- Mudah di-maintain
- Mengikuti Best Practice Laravel
- Siap digunakan untuk production

---

# Tech Stack

Project wajib menggunakan:

- Laravel 12
- PHP 8.3+
- React 19
- Inertia.js
- Vite
- Tailwind CSS
- MySQL
- Axios
- Laravel Breeze (React)
- Laravel Validation
- Laravel Form Request
- Laravel Resource
- Laravel Policies
- Laravel Middleware
- Laravel Migration
- Laravel Seeder
- Laravel Factory
- Laravel Storage
- Laravel Events (jika diperlukan)
- Laravel Queue (jika diperlukan)

---

# Arsitektur

Project harus mengikuti konsep MVC Laravel.

```
app/
│
├── Actions/
├── Services/
├── Repositories/
├── Models/
├── Policies/
│
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Requests/
│   └── Resources/
│
└── Providers/

database/
│
├── migrations/
├── seeders/
└── factories/

routes/
├── web.php
├── auth.php
└── api.php

resources/
└── js/
    ├── Pages/
    ├── Components/
    ├── Layouts/
    ├── Hooks/
    ├── Utils/
    └── Services/
```

---

# Konsep MVC

Business logic **tidak boleh berada di React.**

Business logic **tidak boleh berada di Blade.**

Business logic **seminimal mungkin berada di Controller.**

Controller hanya bertugas:

- menerima request
- authorization
- validation
- memanggil service
- mengembalikan response

---

# Routing

Seluruh route harus memiliki struktur yang jelas.

Gunakan:

- Route Group
- Prefix
- Middleware
- Route Name

Contoh:

```php
Route::middleware(['auth'])
    ->prefix('users')
    ->name('users.')
    ->group(function () {

        Route::get('/', ...)
            ->name('index');

        Route::get('/create', ...)
            ->name('create');

        Route::post('/', ...)
            ->name('store');

        Route::get('/{user}/edit', ...)
            ->name('edit');

        Route::put('/{user}', ...)
            ->name('update');

        Route::delete('/{user}', ...)
            ->name('destroy');

    });
```

Gunakan Resource Route apabila memungkinkan.

Tidak boleh terdapat route yang ambigu.

Seluruh route harus terdokumentasi.

---

# Controller

Controller harus bersifat tipis (Thin Controller).

Controller hanya bertugas:

- Request
- Validation
- Authorization
- Memanggil Service
- Return Response

Controller tidak boleh berisi query database yang kompleks.

Controller tidak boleh berisi business logic yang panjang.

---

# Service Layer

Seluruh business logic dipindahkan ke Service.

Contoh:

```
UserService

BookingService

InvoiceService

PaymentService

ReportService
```

Controller cukup memanggil:

```php
$this->bookingService->store($request);
```

---

# Repository Layer

Seluruh query database yang kompleks dipindahkan ke Repository.

Contoh:

```
BookingRepository

InvoiceRepository

UserRepository
```

Repository bertanggung jawab terhadap:

- Query Builder
- Eloquent Query
- Join
- Filter
- Sorting
- Pagination

---

# Validation

Seluruh validasi menggunakan Form Request.

Contoh:

```
StoreUserRequest

UpdateUserRequest

StoreBookingRequest
```

Tidak diperbolehkan menggunakan:

```php
$request->validate(...)
```

kecuali validasi sederhana yang memang tidak memerlukan Form Request.

---

# API Resource

Seluruh response menggunakan Resource.

Contoh:

```
UserResource

BookingResource

InvoiceResource
```

Response harus konsisten.

---

# Model

Gunakan:

- Fillable
- Cast
- Relationship
- Scope
- Accessor
- Mutator (jika diperlukan)

Relationship harus lengkap.

Contoh:

- belongsTo()
- hasMany()
- hasOne()
- belongsToMany()

---

# Migration

Seluruh tabel harus dibuat menggunakan Migration.

Tidak boleh membuat tabel secara manual.

Migration harus memperhatikan:

- Foreign Key
- Cascade
- Restrict jika diperlukan
- Index
- Unique
- Nullable
- Default Value
- Soft Delete bila diperlukan
- Timestamp

Migration harus dapat dijalankan menggunakan:

```
php artisan migrate
```

tanpa error.

---

# Seeder

Buat Seeder untuk seluruh data awal.

Minimal:

- Admin
- User
- Setting
- Role
- Permission
- Data Dummy

Seeder harus dapat dijalankan menggunakan:

```
php artisan db:seed
```

---

# Factory

Buat Factory untuk seluruh model utama.

Factory digunakan untuk testing maupun dummy data.

---

# Authentication

Gunakan Laravel Authentication.

Session Based Authentication.

Middleware:

- auth
- guest
- verified

---

# Authorization

Gunakan Laravel Policy.

Tidak diperbolehkan melakukan pengecekan role secara manual di Controller.

---

# Frontend

Gunakan:

- React
- Inertia.js
- Tailwind CSS

Struktur:

```
Pages/
Layouts/
Components/
Hooks/
Utils/
Services/
```

---

# Component

Seluruh komponen harus reusable.

Minimal memiliki:

- Button
- Input
- Select
- Dropdown
- Modal
- Table
- Badge
- Pagination
- Toast
- Confirm Dialog
- Card
- Loading
- Skeleton

Tidak menggunakan alert bawaan browser.

---

# State Management

Gunakan:

- React Hook
- Context API (bila diperlukan)

Hindari Redux kecuali memang dibutuhkan.

---

# API Request

Gunakan Axios.

Buat wrapper:

```
resources/js/Services/api.js
```

Seluruh request harus melalui wrapper tersebut.

---

# Pagination

Pagination dilakukan di backend menggunakan Laravel Pagination.

Frontend hanya menerima data pagination.

---

# Searching

Searching dilakukan di backend.

Gunakan Query Builder atau Eloquent.

---

# Filtering

Filtering dilakukan di backend.

---

# Sorting

Sorting dilakukan di backend.

---

# Upload File

Gunakan Laravel Storage.

Tidak menyimpan file langsung ke folder public.

Gunakan:

```
storage/app/public
```

dan

```
php artisan storage:link
```

---

# Database Transaction

Seluruh proses yang melibatkan lebih dari satu tabel wajib menggunakan:

```php
DB::transaction(function () {

});
```

---

# Logging

Gunakan Laravel Log untuk:

- Error
- Exception
- Aktivitas penting (bila diperlukan)

---

# Security

Pastikan seluruh aplikasi memiliki:

- CSRF Protection
- XSS Protection
- SQL Injection Protection
- Validation
- Authorization
- Authentication
- Rate Limiting (bila diperlukan)

---

# Coding Standard

Mengikuti:

- SOLID Principle
- DRY
- KISS
- Clean Code
- Clean Architecture
- PSR-12

Penamaan class harus konsisten.

Contoh:

```
BookingController

BookingService

BookingRepository

StoreBookingRequest

BookingResource
```

---

# Performance

Gunakan:

- Lazy Loading seperlunya
- Eager Loading untuk menghindari N+1 Query
- Index Database
- Cache jika diperlukan
- Queue untuk proses berat

---

# Dokumentasi

Setelah migrasi selesai wajib membuat dokumentasi yang berisi:

- Struktur Folder
- Arsitektur Project
- Diagram Alur Request
- Daftar Route
- Middleware
- Daftar Migration
- Relasi Database
- Daftar Model
- Daftar Service
- Daftar Repository
- Cara Instalasi
- Environment Variable
- Daftar Artisan Command

---

# Target Akhir

Project hasil migrasi harus memenuhi seluruh poin berikut:

- Tidak ada fitur yang hilang dari aplikasi lama.
- Seluruh route terdokumentasi dengan baik.
- Seluruh CRUD menggunakan pola yang konsisten.
- Business logic berada di Service.
- Query kompleks berada di Repository.
- Validasi menggunakan Form Request.
- Response menggunakan Laravel Resource.
- Seluruh tabel dibuat melalui Migration.
- Seluruh data awal menggunakan Seeder.
- Seluruh model memiliki Factory.
- React hanya bertugas sebagai Presentation Layer.
- Mudah dikembangkan untuk fitur baru.
- Mudah dilakukan testing.
- Mengikuti Best Practice Laravel 12.
- Siap digunakan pada lingkungan production.