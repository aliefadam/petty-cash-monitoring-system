<?php

namespace App\Repositories;

use App\Models\Reconciliation;
use Illuminate\Database\Eloquent\Collection;

class ReconciliationRepository
{
    public function allWithTransactions(): Collection
    {
        return Reconciliation::with('transactions')->orderByDesc('year')->orderByDesc('month')->get();
    }

    public function latestWithTransactions(): Collection
    {
        return Reconciliation::with('transactions')->latest('year')->latest('month')->get();
    }
}
