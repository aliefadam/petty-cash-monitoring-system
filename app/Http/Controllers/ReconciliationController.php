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
    public function index(): Response { $this->authorize('viewAny', Reconciliation::class); return Inertia::render('Rekonsiliasi', ['reconciliations' => ReconciliationResource::collection($this->reconciliations->allWithTransactions())->resolve()]); }
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
        return redirect()->route('reconciliations.show', $rec)->with('notice', 'File dan transaksi berhasil disimpan.');
    }
    public function transactions(StoreTransactionsRequest $request, Reconciliation $reconciliation): RedirectResponse
    {
        $this->authorize('update', $reconciliation);
        $this->service->replaceTransactions($reconciliation, $request->validated('transactions'));
        return back()->with('notice', 'Transaksi berhasil disimpan.');
    }
    public function destroy(Reconciliation $reconciliation): RedirectResponse { $this->authorize('delete', $reconciliation); $this->service->delete($reconciliation); return back()->with('notice', 'Rekonsiliasi dihapus.'); }
}
