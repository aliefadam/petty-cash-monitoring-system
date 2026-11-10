<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->get('/user', fn (Illuminate\Http\Request $request) => $request->user());
