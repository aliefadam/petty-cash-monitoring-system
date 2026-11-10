<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReferenceRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }
    public function rules(): array { return ['description' => ['required', 'string', 'max:500'], 'amount' => ['required', 'numeric', 'min:0']]; }
}
