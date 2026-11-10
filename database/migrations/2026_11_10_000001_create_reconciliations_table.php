<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::create('reconciliations', function (Blueprint $table) { $table->id(); $table->unsignedTinyInteger('month'); $table->unsignedSmallInteger('year'); $table->string('file_name'); $table->string('file_path')->nullable(); $table->timestamp('uploaded_at'); $table->timestamps(); $table->unique(['year', 'month']); $table->index(['year', 'month']); }); }
    public function down(): void { Schema::dropIfExists('reconciliations'); }
};
