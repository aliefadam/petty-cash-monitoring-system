<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => (string) $this->id, 'date' => $this->transaction_date->format('Y-m-d'), 'description' => $this->description, 'branch' => $this->branch, 'amount' => (float) $this->amount, 'type' => $this->type, 'balance' => $this->balance === null ? null : (float) $this->balance, 'keywords' => $this->keywords ?? []];
    }
}
