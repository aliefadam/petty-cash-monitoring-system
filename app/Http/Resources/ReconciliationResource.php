<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReconciliationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => (string) $this->id, 'month' => $this->month, 'year' => $this->year, 'fileName' => $this->file_name, 'uploadedAt' => $this->uploaded_at->toISOString(), 'transactions' => $this->whenLoaded('transactions', fn () => TransactionResource::collection($this->transactions)->resolve())];
    }
}
