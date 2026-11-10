<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReferenceResource extends JsonResource
{
    public function toArray(Request $request): array { return ['id' => (string) $this->id, 'code' => $this->code, 'description' => $this->description, 'amount' => (float) $this->amount, 'createdAt' => $this->created_at->toISOString()]; }
}
