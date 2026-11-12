<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReconciliationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => (string) $this->id, 'month' => $this->month, 'year' => $this->year, 'fileName' => $this->file_name, 'uploadedAt' => $this->uploaded_at->toISOString(), 'openingBalance' => $this->opening_balance === null ? null : (float) $this->opening_balance, 'balanceShortage' => $this->balance_shortage === null ? null : (float) $this->balance_shortage, 'updatedBalance' => $this->updated_balance === null ? null : (float) $this->updated_balance, 'pendingReimburse' => $this->pending_reimburse === null ? null : (float) $this->pending_reimburse, 'transactions' => $this->whenLoaded('transactions', fn () => TransactionResource::collection($this->transactions)->resolve())];
    }
}
