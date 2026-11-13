<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => (string) $this->id, 'rowNumber' => $this->row_number, 'date' => $this->transaction_date->format('Y-m-d'), 'description' => $this->description, 'branch' => $this->branch, 'amount' => (float) $this->amount, 'type' => $this->type, 'balance' => $this->balance === null ? null : (float) $this->balance, 'keywords' => $this->keywords ?? [], 'inv' => $this->inv, 'tl' => $this->tl, 'rfq' => $this->rfq, 'pr' => $this->pr, 'po' => $this->po, 'suratNo' => $this->surat_no, 'referenceCode' => $this->reference_code, 'title' => $this->title, 'note' => $this->note, 'debit' => $this->debit === null ? null : (float) $this->debit, 'credit' => $this->credit === null ? null : (float) $this->credit, 'transactionLabel' => $this->transaction_label, 'reimburse' => $this->reimburse];
    }
}
