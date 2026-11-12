<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReconciliationRequest;
use App\Http\Requests\StoreTransactionsRequest;
use App\Http\Resources\ReconciliationResource;
use App\Http\Resources\ReferenceResource;
use App\Models\Reconciliation;
use App\Repositories\ReconciliationRepository;
use App\Repositories\ReferenceRepository;
use App\Services\DetectedCodeLookupService;
use App\Services\ReconciliationService;
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
        $data = $request->validate(['code' => ['required', 'string', 'max:100']]);

        try {
            return response()->json($lookup->lookup($data['code']));
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['message' => 'Detail kode tidak dapat dimuat. Periksa koneksi database bisnis.'], 503);
        }
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
        $data = $request->validate([
            'transaction.date' => ['required', 'date'],
            'transaction.inv' => ['nullable', 'string', 'max:100'],
            'transaction.tl' => ['nullable', 'string', 'max:100'],
            'transaction.rfq' => ['nullable', 'string', 'max:100'],
            'transaction.pr' => ['nullable', 'string', 'max:100'],
            'transaction.po' => ['nullable', 'string', 'max:100'],
            'transaction.suratNo' => ['nullable', 'string', 'max:150'],
            'transaction.title' => ['nullable', 'string'],
            'transaction.note' => ['nullable', 'string'],
            'transaction.debit' => ['nullable', 'numeric', 'min:0'],
            'transaction.credit' => ['nullable', 'numeric', 'min:0'],
            'transaction.balance' => ['nullable', 'numeric'],
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
        $reconciliation = $this->reconciliations->latestUploadedWithTransactions();
        if (!$reconciliation) {
            $date = \Illuminate\Support\Carbon::parse($row['date']);
            $reconciliation = Reconciliation::create(['month' => $date->month, 'year' => $date->year, 'file_name' => 'Input manual', 'uploaded_at' => now()]);
        }
        $row['rowNumber'] = ((int) $reconciliation->transactions()->max('row_number')) + 1;
        $this->service->addMonitoringTransaction($reconciliation, $row);
        return redirect()->route('reconciliations.index')->with('notice', 'Data monitoring berhasil ditambahkan.');
    }
    public function transactions(StoreTransactionsRequest $request, Reconciliation $reconciliation): RedirectResponse
    {
        $this->authorize('update', $reconciliation);
        $this->service->replaceTransactions($reconciliation, $request->validated('transactions'));
        return back()->with('notice', 'Transaksi berhasil disimpan.');
    }
    public function destroy(Reconciliation $reconciliation): RedirectResponse { $this->authorize('delete', $reconciliation); $this->service->delete($reconciliation); return back()->with('notice', 'Rekonsiliasi dihapus.'); }
}
