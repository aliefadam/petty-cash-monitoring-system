<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reconciliation extends Model
{
    use HasFactory;

    protected $fillable = ['month', 'year', 'file_name', 'uploaded_at', 'file_path', 'opening_balance', 'balance_shortage', 'updated_balance', 'pending_reimburse'];
    protected function casts(): array { return ['uploaded_at' => 'datetime']; }
    public function transactions(): HasMany { return $this->hasMany(Transaction::class); }
}
