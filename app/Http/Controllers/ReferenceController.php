<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReferenceRequest;
use App\Http\Resources\ReferenceResource;
use App\Models\Reference;
use App\Repositories\ReferenceRepository;
use App\Services\ReferenceService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ReferenceController extends Controller
{
    public function __construct(private readonly ReferenceService $service, private readonly ReferenceRepository $references) {}
    public function index(): Response { $this->authorize('viewAny', Reference::class); return Inertia::render('Referensi', ['references' => ReferenceResource::collection($this->references->allLatest())->resolve()]); }
    public function store(StoreReferenceRequest $request): RedirectResponse { $this->authorize('create', Reference::class); $this->service->create($request->validated()); return redirect()->route('references.index')->with('notice', 'Nomor referensi berhasil dibuat.'); }
    public function destroy(Reference $reference): RedirectResponse { $this->authorize('delete', $reference); $reference->delete(); return back()->with('notice', 'Nomor referensi dihapus.'); }
}
