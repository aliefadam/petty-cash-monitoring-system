<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReconciliationRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }
    public function rules(): array { return ['month' => ['required', 'integer', 'between:1,12'], 'year' => ['required', 'integer', 'between:2000,2100'], 'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'], 'transactions' => ['required', 'array', 'min:1'], 'transactions.*.date' => ['required', 'date'], 'transactions.*.description' => ['required', 'string'], 'transactions.*.branch' => ['nullable', 'string'], 'transactions.*.amount' => ['required', 'numeric', 'min:0'], 'transactions.*.type' => ['required', 'in:DB,CR'], 'transactions.*.balance' => ['nullable', 'numeric'], 'transactions.*.keywords' => ['nullable', 'array']]; }
}
