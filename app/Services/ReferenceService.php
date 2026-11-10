<?php

namespace App\Services;

use App\Models\Reference;
use Illuminate\Support\Str;

class ReferenceService
{
    public function create(array $data): Reference
    {
        do { $code = Str::upper(Str::random(7)); } while (Reference::where('code', $code)->exists());
        return Reference::create([...$data, 'code' => $code]);
    }
}
