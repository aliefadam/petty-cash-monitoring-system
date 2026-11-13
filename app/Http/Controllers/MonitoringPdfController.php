<?php

namespace App\Http\Controllers;

use App\Models\Reconciliation;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MonitoringPdfController extends Controller
{
    public function __invoke(Request $request)
    {
        $this->authorize('viewAny', Reconciliation::class);

        $filters = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'month' => ['nullable', 'date_format:Y-m'],
            'inv' => ['nullable', 'string', 'max:100'],
            'tl' => ['nullable', 'string', 'max:100'],
            'rfq' => ['nullable', 'string', 'max:100'],
            'pr' => ['nullable', 'string', 'max:100'],
            'po' => ['nullable', 'string', 'max:100'],
            'suratNo' => ['nullable', 'string', 'max:150'],
            'referenceCode' => ['nullable', 'string', 'max:100'],
            'reimburse' => ['nullable', Rule::in(['Sudah', 'Belum', 'Partial', '__empty__'])],
            'search' => ['nullable', 'string', 'max:200'],
        ]);

        $latest = Reconciliation::query()->orderByDesc('updated_at')->orderByDesc('uploaded_at')->orderByDesc('id')->first();
        $transactions = Transaction::query()
            ->when($latest, fn (Builder $query) => $query->where('reconciliation_id', $latest->id), fn (Builder $query) => $query->whereRaw('1 = 0'))
            ->when(!empty($filters['date']), fn (Builder $query) => $query->whereDate('transaction_date', $filters['date']))
            ->when(!empty($filters['month']), function (Builder $query) use ($filters) {
                [$year, $month] = array_map('intval', explode('-', $filters['month']));
                $query->whereYear('transaction_date', $year)->whereMonth('transaction_date', $month);
            })
            ->when(!empty($filters['inv']), fn (Builder $query) => $query->where('inv', $filters['inv']))
            ->when(!empty($filters['tl']), fn (Builder $query) => $query->where('tl', $filters['tl']))
            ->when(!empty($filters['rfq']), fn (Builder $query) => $query->where('rfq', $filters['rfq']))
            ->when(!empty($filters['pr']), fn (Builder $query) => $query->where('pr', $filters['pr']))
            ->when(!empty($filters['po']), fn (Builder $query) => $query->where('po', $filters['po']))
            ->when(!empty($filters['suratNo']), fn (Builder $query) => $query->where('surat_no', 'like', '%' . $filters['suratNo'] . '%'))
            ->when(!empty($filters['referenceCode']), fn (Builder $query) => $query->where('reference_code', $filters['referenceCode']))
            ->when(isset($filters['reimburse']) && $filters['reimburse'] === '__empty__', fn (Builder $query) => $query->where(fn (Builder $q) => $q->whereNull('reimburse')->orWhere('reimburse', '')))
            ->when(!empty($filters['reimburse']) && $filters['reimburse'] !== '__empty__', fn (Builder $query) => $query->where('reimburse', $filters['reimburse']))
            ->when(!empty($filters['search']), function (Builder $query) use ($filters) {
                $search = trim($filters['search']);
                $like = '%' . $search . '%';
                $query->where(function (Builder $q) use ($like) {
                    foreach (['inv', 'tl', 'rfq', 'pr', 'po', 'surat_no', 'reference_code', 'title', 'note', 'transaction_label', 'reimburse', 'amount', 'transaction_date', 'keywords'] as $column) {
                        $q->orWhere($column, 'like', $like);
                    }
                });
            })
            ->orderByDesc('transaction_date')->orderByDesc('row_number')->orderByDesc('id')->get();

        $filterLabels = collect([
            'Tanggal' => $filters['date'] ?? null,
            'Bulan' => $filters['month'] ?? null,
            'INV' => $filters['inv'] ?? null,
            'TL' => $filters['tl'] ?? null,
            'RFQ' => $filters['rfq'] ?? null,
            'PR' => $filters['pr'] ?? null,
            'PO' => $filters['po'] ?? null,
            'Surat No' => $filters['suratNo'] ?? null,
            'No. Referensi' => $filters['referenceCode'] ?? null,
            'Reimburse' => isset($filters['reimburse']) ? ($filters['reimburse'] === '__empty__' ? 'Belum diisi' : $filters['reimburse']) : null,
            'Pencarian' => $filters['search'] ?? null,
        ])->filter(fn ($value) => filled($value));

        $pdf = Pdf::loadView('pdf.monitoring', [
            'transactions' => $transactions,
            'filterLabels' => $filterLabels,
            'generatedAt' => now(),
        ])->setPaper('a4', 'landscape');

        return $pdf->download('Monitoring_Petty_Cash_' . now()->format('Ymd_His') . '.pdf');
    }
}
