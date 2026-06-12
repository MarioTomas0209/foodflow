<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignUlid('daily_menu_item_id')->nullable()->after('product_variant_id')->constrained()->nullOnDelete();
            $table->foreignUlid('daily_menu_item_variant_id')->nullable()->after('daily_menu_item_id')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('daily_menu_item_variant_id');
            $table->dropConstrainedForeignId('daily_menu_item_id');
        });
    }
};
