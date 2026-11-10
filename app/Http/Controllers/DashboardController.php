<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReconciliationResource;
use App\Http\Resources\ReferenceResource;
use App\Repositories\ReconciliationRepository;
use App\Repositories\ReferenceRepository;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly ReconciliationRepository $reconciliations, private readonly ReferenceRepository $references) {}

    public function __invoke(): Response
    {
        return Inertia::render('Dashboard', ['reconciliations' => ReconciliationResource::collection($this->reconciliations->latestWithTransactions())->resolve(), 'references' => ReferenceResource::collection($this->references->allLatest())->resolve()]);
    }
}
