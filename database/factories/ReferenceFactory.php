<?php

namespace Database\Factories;

use App\Models\Reference;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ReferenceFactory extends Factory
{
    protected $model = Reference::class;
    public function definition(): array { return ['code' => Str::upper(Str::random(7)), 'description' => fake()->sentence(), 'amount' => fake()->randomFloat(2, 10000, 5000000)]; }
}
