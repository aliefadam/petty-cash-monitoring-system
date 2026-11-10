<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::create('transactions', function (Blueprint $table) { $table->id(); $table->foreignId('reconciliation_id')->constrained()->cascadeOnDelete(); $table->date('transaction_date')->index(); $table->text('description'); $table->string('branch', 30)->nullable(); $table->decimal('amount', 18, 2); $table->enum('type', ['DB', 'CR']); $table->decimal('balance', 18, 2)->nullable(); $table->json('keywords')->nullable(); $table->timestamps(); $table->index(['reconciliation_id', 'type']); }); }
    public function down(): void { Schema::dropIfExists('transactions'); }
};
