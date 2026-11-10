<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReconciliationController;
use App\Http\Controllers\ReferenceController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', fn () => inertia('Login'))->name('login');
    Route::post('/login', [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'store'])->middleware('throttle:5,1')->name('login.store');
});
Route::post('/logout', [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'destroy'])->middleware('auth')->name('logout');
Route::middleware('auth')->group(function () {
    Route::get('/', fn () => redirect()->route('dashboard'));
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::prefix('rekonsiliasi')->name('reconciliations.')->group(function () {
        Route::get('/', [ReconciliationController::class, 'index'])->name('index');
        Route::post('/', [ReconciliationController::class, 'store'])->name('store');
        Route::post('/lookup-detail', [ReconciliationController::class, 'lookupDetail'])->name('lookup-detail');
        Route::get('/{reconciliation}', [ReconciliationController::class, 'show'])->whereNumber('reconciliation')->name('show');
        Route::put('/{reconciliation}/transactions', [ReconciliationController::class, 'transactions'])->whereNumber('reconciliation')->name('transactions');
        Route::delete('/{reconciliation}', [ReconciliationController::class, 'destroy'])->whereNumber('reconciliation')->name('destroy');
    });
    Route::resource('referensi', ReferenceController::class)->only(['index', 'store', 'destroy'])->parameters(['referensi' => 'reference'])->names(['index' => 'references.index', 'store' => 'references.store', 'destroy' => 'references.destroy']);
});
