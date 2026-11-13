<?php

namespace App\Services;

use App\Models\Reference;
use Illuminate\Support\Str;

class ReferenceService
{
    public function create(array $data): Reference
    {
        $code = $this->generateCode();
        return Reference::create([...$data, 'code' => $code]);
    }

    public function generateCode(): string
    {
        do { $code = Str::upper(Str::random(7)); } while (Reference::where('code', $code)->exists());
        return $code;
    }
}
