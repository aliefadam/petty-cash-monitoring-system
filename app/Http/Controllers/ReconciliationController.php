<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReconciliationRequest;
use App\Http\Requests\StoreTransactionsRequest;
use App\Http\Resources\ReconciliationResource;
use App\Http\Resources\ReferenceResource;
use App\Models\Reconciliation;
use App\Models\Reference;
use App\Models\Transaction;
use App\Repositories\ReconciliationRepository;
use App\Repositories\ReferenceRepository;
use App\Services\DetectedCodeLookupService;
use App\Services\ReconciliationService;
use App\Services\ReferenceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReconciliationController extends Controller
{
    public function __construct(private readonly ReconciliationService $service, private readonly ReconciliationRepository $reconciliations, private readonly ReferenceRepository $references) {}
    public function index(): Response { $this->authorize('viewAny', Reconciliation::class); $reconciliation = $this->reconciliations->latestUploadedWithTransactions(); return Inertia::render('RekonsiliasiDetail', ['reconciliation' => $reconciliation ? (new ReconciliationResource($reconciliation))->resolve() : null, 'references' => ReferenceResource::collection($this->references->allLatest())->resolve()]); }
    public function show(Reconciliation $reconciliation): Response { $this->authorize('view', $reconciliation); return Inertia::render('RekonsiliasiDetail', ['reconciliation' => (new ReconciliationResource($reconciliation->load('transactions')))->resolve(), 'references' => ReferenceResource::collection($this->references->allLatest())->resolve()]); }
    public function lookupDetail(Request $request, DetectedCodeLookupService $lookup): JsonResponse
    {
        $this->authorize('viewAny', Reconciliation::class);
        $data = $request->validate([
            'code' => ['required', 'string', 'max:100'],
            'kind' => ['nullable', 'in:po,rfq,pr,prefix'],
        ]);

        try {
            return response()->json($lookup->lookup($data['code'], $data['kind'] ?? null));
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Detail kode tidak dapat dimuat. Periksa koneksi database bisnis.'], 503);
        }
    }

    public function lookupOptions(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Reconciliation::class);
        $data = $request->validate([
            'field' => ['required', 'in:inv,tl,rfq,pr,po,reference'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        if ($data['field'] === 'reference') {
            $search = trim($data['q'] ?? '');
            $references = Reference::query()
                ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                    $query->where('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                }))
                ->latest()
                ->limit(30)
                ->get(['code', 'description', 'amount']);

            return response()->json(['options' => $references->map(fn (Reference $reference) => [
                'value' => $reference->code,
                'label' => $reference->code . ' · ' . $reference->description . ' · Rp ' . number_format((float) $reference->amount, 0, ',', '.'),
            ])->values()]);
        }

        $columns = [
            'inv' => ['table' => 'invoice', 'column' => 'invoice_no'],
            'tl' => ['table' => 'payment', 'column' => 'payment_no'],
            'rfq' => ['table' => 'rfq_header', 'column' => 'rfq_no'],
            'pr' => ['table' => 'pr', 'column' => 'pr_no'],
            'po' => ['table' => 'purchase_order', 'column' => 'po_no'],
        ];
        $source = $columns[$data['field']];
        $search = trim($data['q'] ?? '');
        $query = \Illuminate\Support\Facades\DB::connection('bmt_multisales')
            ->table($source['table'])
            ->whereNotNull($source['column'])
            ->where($source['column'], '<>', '');

        if ($search !== '') {
            $query->where($source['column'], 'like', '%' . addcslashes($search, '%_\\') . '%');
        }

        $options = $query->select($source['column'])
            ->distinct()
            ->orderByDesc($source['column'])
            ->limit(30)
            ->pluck($source['column'])
            ->map(fn ($value) => ['value' => (string) $value, 'label' => (string) $value])
            ->values();

        return response()->json(['options' => $options]);
    }

    public function generateReference(ReferenceService $references): JsonResponse
    {
        $this->authorize('create', Reference::class);
        return response()->json(['code' => $references->generateCode()]);
    }

    public function store(StoreReconciliationRequest $request): RedirectResponse
    {
        $this->authorize('create', Reconciliation::class);
        $data = $request->validated();
        $rec = $this->service->saveUpload($data, $request->file('file'));
        return redirect()->route('reconciliations.index')->with('notice', 'File monitoring berhasil diperbarui.');
    }
    public function addMonitoringTransaction(Request $request): RedirectResponse
    {
        $this->authorize('viewAny', Reconciliation::class);
        $row = $this->validatedMonitoringRow($request);
        $reconciliation = $this->reconciliations->latestUploadedWithTransactions();
        if (!$reconciliation) {
            $date = \Illuminate\Support\Carbon::parse($row['date']);
            $reconciliation = Reconciliation::create(['month' => $date->month, 'year' => $date->year, 'file_name' => 'Input manual', 'uploaded_at' => now()]);
        }
        $row['rowNumber'] = ((int) $reconciliation->transactions()->max('row_number')) + 1;
        $this->service->addMonitoringTransaction($reconciliation, $row);
        return redirect()->route('reconciliations.index')->with('notice', 'Data monitoring berhasil ditambahkan.');
    }

    public function updateMonitoringTransaction(Request $request, Transaction $transaction): RedirectResponse
    {
        $this->authorize('viewAny', Reconciliation::class);
        $this->service->updateMonitoringTransaction($transaction, $this->validatedMonitoringRow($request));
        return redirect()->route('reconciliations.index')->with('notice', 'Data monitoring berhasil diperbarui.');
    }

    public function deleteMonitoringTransaction(Transaction $transaction): RedirectResponse
    {
        $this->authorize('viewAny', Reconciliation::class);
        $this->service->deleteMonitoringTransaction($transaction);
        return redirect()->route('reconciliations.index')->with('notice', 'Data monitoring berhasil dihapus.');
    }

    private function validatedMonitoringRow(Request $request): array
    {
        $data = $request->validate([
            'transaction.date' => ['required', 'date'],
            'transaction.inv' => ['nullable', 'string', 'max:100'],
            'transaction.tl' => ['nullable', 'string', 'max:100'],
            'transaction.rfq' => ['nullable', 'string', 'max:100'],
            'transaction.pr' => ['nullable', 'string', 'max:100'],
            'transaction.po' => ['nullable', 'string', 'max:100'],
            'transaction.suratNo' => ['nullable', 'string', 'max:150'],
            'transaction.referenceCode' => ['nullable', 'string', 'size:7'],
            'transaction.referenceCodeGenerated' => ['nullable', 'boolean'],
            'transaction.title' => ['nullable', 'string'],
            'transaction.note' => ['nullable', 'string'],
            'transaction.debit' => ['nullable', 'numeric', 'min:0'],
            'transaction.credit' => ['nullable', 'numeric', 'min:0'],
            'transaction.transactionLabel' => ['nullable', 'string', 'max:100'],
            'transaction.reimburse' => ['nullable', 'string', 'max:100'],
        ]);
        $row = $data['transaction'];
        if ((float) ($row['debit'] ?? 0) > 0 && (float) ($row['credit'] ?? 0) > 0) {
            throw \Illuminate\Validation\ValidationException::withMessages(['transaction.debit' => 'Isi salah satu: Debit atau Kredit.']);
        }
        if ((float) ($row['debit'] ?? 0) <= 0 && (float) ($row['credit'] ?? 0) <= 0) {
            throw \Illuminate\Validation\ValidationException::withMessages(['transaction.debit' => 'Isi nominal Debit atau Kredit.']);
        }
        return $row;
    }
    public function transactions(StoreTransactionsRequest $request, Reconciliation $reconciliation): RedirectResponse
    {
        $this->authorize('update', $reconciliation);
        $this->service->replaceTransactions($reconciliation, $request->validated('transactions'));
        return back()->with('notice', 'Transaksi berhasil disimpan.');
    }
    public function destroy(Reconciliation $reconciliation): RedirectResponse { $this->authorize('delete', $reconciliation); $this->service->delete($reconciliation); return back()->with('notice', 'Rekonsiliasi dihapus.'); }
}
