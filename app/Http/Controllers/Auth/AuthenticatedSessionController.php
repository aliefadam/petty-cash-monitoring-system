<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate(['username' => ['required', 'string'], 'password' => ['required', 'string']]);
        try {
            $user = \App\Models\User::query()
                ->where('username', trim($credentials['username']))
                ->where('is_active', 1)
                ->first();
        } catch (\Throwable $exception) {
            report($exception);
            throw ValidationException::withMessages(['username' => 'Login sementara tidak tersedia. Coba kembali beberapa saat lagi.']);
        }

        if (!$user || !$user->auth || !Hash::check($credentials['password'], $user->auth)) {
            throw ValidationException::withMessages(['password' => 'Username atau password salah']);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();
        return redirect()->intended(route('dashboard'));
    }
    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout(); $request->session()->invalidate(); $request->session()->regenerateToken();
        return redirect()->route('login');
    }
}
