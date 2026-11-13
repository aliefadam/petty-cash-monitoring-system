<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class StoreReconciliationRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    protected function prepareForValidation(): void
    {
        foreach (['transactionsJson' => 'transactions', 'summaryJson' => 'summary'] as $source => $target) {
            $json = $this->input($source);
            if (!is_string($json)) continue;

            $decoded = json_decode($json, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                throw ValidationException::withMessages([$source => 'Payload file monitoring tidak valid. Silakan coba unggah ulang.']);
            }

            $this->merge([$target => $decoded]);
        }
    }

    public function rules(): array
    {
        return [
            'month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
            'transactions' => ['required', 'array', 'min:1'],
            'transactions.*.rowNumber' => ['nullable', 'integer', 'min:1'],
            'transactions.*.date' => ['required', 'date'],
            'transactions.*.description' => ['required', 'string'],
            'transactions.*.branch' => ['nullable', 'string'],
            'transactions.*.amount' => ['required', 'numeric', 'min:0'],
            'transactions.*.type' => ['required', 'in:DB,CR'],
            'transactions.*.balance' => ['nullable', 'numeric'],
            'transactions.*.keywords' => ['nullable', 'array'],
            'transactions.*.inv' => ['nullable', 'string', 'max:100'],
            'transactions.*.tl' => ['nullable', 'string', 'max:100'],
            'transactions.*.rfq' => ['nullable', 'string', 'max:100'],
            'transactions.*.pr' => ['nullable', 'string', 'max:100'],
            'transactions.*.po' => ['nullable', 'string', 'max:100'],
            'transactions.*.suratNo' => ['nullable', 'string', 'max:150'],
            'transactions.*.referenceCode' => ['nullable', 'string', 'size:7'],
            'transactions.*.title' => ['nullable', 'string'],
            'transactions.*.note' => ['nullable', 'string'],
            'transactions.*.debit' => ['nullable', 'numeric', 'min:0'],
            'transactions.*.credit' => ['nullable', 'numeric', 'min:0'],
            'transactions.*.transactionLabel' => ['nullable', 'string', 'max:100'],
            'transactions.*.reimburse' => ['nullable', 'string', 'max:100'],
            'summary' => ['nullable', 'array'],
            'summary.openingBalance' => ['nullable', 'numeric'],
            'summary.balanceShortage' => ['nullable', 'numeric'],
            'summary.updatedBalance' => ['nullable', 'numeric'],
            'summary.pendingReimburse' => ['nullable', 'numeric'],
        ];
    }
}
