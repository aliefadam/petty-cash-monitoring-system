<?php

namespace App\Repositories;

use App\Models\Reference;
use Illuminate\Database\Eloquent\Collection;

class ReferenceRepository
{
    public function allLatest(): Collection
    {
        return Reference::latest()->get();
    }
}
