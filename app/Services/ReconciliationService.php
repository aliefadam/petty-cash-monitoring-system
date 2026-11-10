<?php

namespace App\Services;

use App\Models\Reconciliation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ReconciliationService
{
    public function saveUpload(array $data, $file): Reconciliation
    {
        return DB::transaction(function () use ($data, $file) {
            $path = $file->store('reconciliations', 'public');
            $reconciliation = Reconciliation::updateOrCreate(['month' => $data['month'], 'year' => $data['year']], ['file_name' => $file->getClientOriginalName(), 'file_path' => $path, 'uploaded_at' => now()]);
            $reconciliation->transactions()->delete();
            $reconciliation->transactions()->createMany(array_map(fn ($row) => ['transaction_date' => $row['date'], 'description' => $row['description'], 'branch' => $row['branch'] ?? '', 'amount' => $row['amount'], 'type' => $row['type'], 'balance' => $row['balance'] ?? null, 'keywords' => $row['keywords'] ?? []], $data['transactions']));
            return $reconciliation->load('transactions');
        });
    }

    public function replaceTransactions(Reconciliation $reconciliation, array $transactions): Reconciliation
    {
        return DB::transaction(function () use ($reconciliation, $transactions) {
            $reconciliation->transactions()->delete();
            $reconciliation->transactions()->createMany(array_map(fn ($row) => ['transaction_date' => $row['date'], 'description' => $row['description'], 'branch' => $row['branch'] ?? '', 'amount' => $row['amount'], 'type' => $row['type'], 'balance' => $row['balance'] ?? null, 'keywords' => $row['keywords'] ?? []], $transactions));
            return $reconciliation->load('transactions');
        });
    }

    public function delete(Reconciliation $reconciliation): void
    {
        DB::transaction(function () use ($reconciliation) {
            if ($reconciliation->file_path) Storage::disk('public')->delete($reconciliation->file_path);
            $reconciliation->delete();
        });
    }
}
