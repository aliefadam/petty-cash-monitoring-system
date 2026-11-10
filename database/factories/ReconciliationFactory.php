<?php

namespace Database\Factories;

use App\Models\Reconciliation;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReconciliationFactory extends Factory
{
    protected $model = Reconciliation::class;
    public function definition(): array { return ['month' => fake()->numberBetween(1, 12), 'year' => fake()->numberBetween(2024, 2026), 'file_name' => fake()->word().'.xlsx', 'uploaded_at' => now()]; }
}
