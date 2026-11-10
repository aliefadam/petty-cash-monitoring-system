<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $connection = 'bmt_multisales';
    protected $table = 'users';
    protected $authPasswordName = 'auth';
    protected $rememberTokenName = '';
    protected $hidden = ['auth', 'two_factor_secret', 'two_factor_recovery_codes'];
}
