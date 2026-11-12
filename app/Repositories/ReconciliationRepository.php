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

    public function latestUploadedWithTransactions(): ?Reconciliation
    {
        return Reconciliation::with('transactions')->orderByDesc('updated_at')->orderByDesc('uploaded_at')->orderByDesc('id')->first();
    }
}
