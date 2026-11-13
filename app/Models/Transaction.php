<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = ['reconciliation_id', 'row_number', 'transaction_date', 'description', 'branch', 'amount', 'type', 'balance', 'keywords', 'inv', 'tl', 'rfq', 'pr', 'po', 'surat_no', 'reference_code', 'title', 'note', 'debit', 'credit', 'transaction_label', 'reimburse'];
    protected function casts(): array { return ['transaction_date' => 'date:Y-m-d', 'amount' => 'decimal:2', 'balance' => 'decimal:2', 'keywords' => 'array']; }
    public function reconciliation(): BelongsTo { return $this->belongsTo(Reconciliation::class); }
}
