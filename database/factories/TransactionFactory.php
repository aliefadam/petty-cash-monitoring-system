<?php

namespace Database\Factories;

use App\Models\Reconciliation;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionFactory extends Factory
{
    protected $model = Transaction::class;
    public function definition(): array { return ['reconciliation_id' => Reconciliation::factory(), 'transaction_date' => fake()->date(), 'description' => fake()->sentence(), 'branch' => '0000', 'amount' => fake()->randomFloat(2, 10000, 5000000), 'type' => fake()->randomElement(['DB', 'CR']), 'balance' => null, 'keywords' => []]; }
}
