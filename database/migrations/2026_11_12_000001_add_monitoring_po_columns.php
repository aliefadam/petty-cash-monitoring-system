<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('reconciliations', function (Blueprint $table) {
            $table->decimal('opening_balance', 18, 2)->nullable();
            $table->decimal('balance_shortage', 18, 2)->nullable();
            $table->decimal('updated_balance', 18, 2)->nullable();
            $table->decimal('pending_reimburse', 18, 2)->nullable();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedInteger('row_number')->nullable();
            $table->string('inv', 100)->nullable();
            $table->string('tl', 100)->nullable();
            $table->string('rfq', 100)->nullable();
            $table->string('pr', 100)->nullable();
            $table->string('po', 100)->nullable();
            $table->string('surat_no', 150)->nullable();
            $table->text('title')->nullable();
            $table->text('note')->nullable();
            $table->decimal('debit', 18, 2)->nullable();
            $table->decimal('credit', 18, 2)->nullable();
            $table->string('transaction_label', 100)->nullable();
            $table->string('reimburse', 100)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['row_number', 'inv', 'tl', 'rfq', 'pr', 'po', 'surat_no', 'title', 'note', 'debit', 'credit', 'transaction_label', 'reimburse']);
        });

        Schema::table('reconciliations', function (Blueprint $table) {
            $table->dropColumn(['opening_balance', 'balance_shortage', 'updated_balance', 'pending_reimburse']);
        });
    }
};
