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
            $reconciliation = Reconciliation::updateOrCreate(
                ['month' => $data['month'], 'year' => $data['year']],
                [
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'uploaded_at' => now(),
                    'opening_balance' => data_get($data, 'summary.openingBalance'),
                    'balance_shortage' => data_get($data, 'summary.balanceShortage'),
                    'updated_balance' => data_get($data, 'summary.updatedBalance'),
                    'pending_reimburse' => data_get($data, 'summary.pendingReimburse'),
                ]
            );
            $reconciliation->transactions()->delete();
            $reconciliation->transactions()->createMany(array_map(fn ($row) => $this->transactionAttributes($row), $data['transactions']));
            return $reconciliation->load('transactions');
        });
    }

    public function addMonitoringTransaction(Reconciliation $reconciliation, array $row): void
    {
        $reconciliation->transactions()->create($this->transactionAttributes($row));
        $reconciliation->touch();
    }

    public function replaceTransactions(Reconciliation $reconciliation, array $transactions): Reconciliation
    {
        return DB::transaction(function () use ($reconciliation, $transactions) {
            $reconciliation->transactions()->delete();
            $reconciliation->transactions()->createMany(array_map(fn ($row) => $this->transactionAttributes($row), $transactions));
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

    private function transactionAttributes(array $row): array
    {
        $debit = $row['debit'] ?? (($row['type'] ?? null) === 'DB' ? $row['amount'] : null);
        $credit = $row['credit'] ?? (($row['type'] ?? null) === 'CR' ? $row['amount'] : null);
        $type = (float) ($debit ?? 0) > 0 ? 'DB' : 'CR';
        $amount = $type === 'DB' ? (float) $debit : (float) ($credit ?? $row['amount'] ?? 0);
        $description = $row['description'] ?? implode(' · ', array_filter([
            $row['title'] ?? null,
            $row['note'] ?? null,
            $row['po'] ?? null,
            $row['suratNo'] ?? null,
            $row['pr'] ?? null,
            $row['rfq'] ?? null,
            $row['tl'] ?? null,
            $row['inv'] ?? null,
            $row['transactionLabel'] ?? null,
        ]));

        return [
            'row_number' => $row['rowNumber'] ?? null,
            'transaction_date' => $row['date'],
            'description' => $description ?: 'Transaksi tanpa keterangan',
            'branch' => $row['branch'] ?? '',
            'amount' => $amount,
            'type' => $type,
            'balance' => $row['balance'] ?? null,
            'keywords' => $row['keywords'] ?? $this->extractKeywords($description),
            'inv' => $row['inv'] ?? null,
            'tl' => $row['tl'] ?? null,
            'rfq' => $row['rfq'] ?? null,
            'pr' => $row['pr'] ?? null,
            'po' => $row['po'] ?? null,
            'surat_no' => $row['suratNo'] ?? $row['surat_no'] ?? null,
            'title' => $row['title'] ?? null,
            'note' => $row['note'] ?? null,
            'debit' => $debit,
            'credit' => $credit,
            'transaction_label' => $row['transactionLabel'] ?? $row['transaction_label'] ?? null,
            'reimburse' => $row['reimburse'] ?? null,
        ];
    }

    private function extractKeywords(string $text): array
    {
        $keywords = [];
        preg_match_all('/(?<![A-Z0-9])(\d{2,6}\/[A-Z]{1,8}-PO\/\d{1,2}\/\d{4})(?![A-Z0-9])/i', $text, $poMatches);
        foreach (array_unique(array_map('strtoupper', $poMatches[1] ?? [])) as $value) {
            $keywords[] = ['kind' => 'po', 'value' => $value];
        }
        preg_match_all('/(?<![A-Z0-9])(OP|TX|PF|BL|RE|PAY)-[A-Z0-9]+(?:-[A-Z0-9]+)*/i', $text, $prefixMatches, PREG_SET_ORDER);
        foreach ($prefixMatches as $match) {
            $value = strtoupper($match[0]);
            if (!collect($keywords)->contains('value', $value)) {
                $keywords[] = ['kind' => 'prefix', 'value' => $value, 'prefix' => strtoupper($match[1])];
            }
        }
        return $keywords;
    }
}
