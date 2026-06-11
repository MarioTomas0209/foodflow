<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Orders were stored while APP_TIMEZONE was UTC. Convert existing
     * timestamps to America/Mexico_City wall time.
     */
    public function up(): void
    {
        DB::table('orders')
            ->orderBy('created_at')
            ->lazy()
            ->each(function ($order) {
                DB::table('orders')->where('id', $order->id)->update([
                    'created_at' => Carbon::parse($order->created_at, 'UTC')
                        ->timezone('America/Mexico_City')
                        ->toDateTimeString(),
                    'updated_at' => Carbon::parse($order->updated_at, 'UTC')
                        ->timezone('America/Mexico_City')
                        ->toDateTimeString(),
                ]);
            });

        DB::table('order_items')
            ->orderBy('created_at')
            ->lazy()
            ->each(function ($item) {
                DB::table('order_items')->where('id', $item->id)->update([
                    'created_at' => Carbon::parse($item->created_at, 'UTC')
                        ->timezone('America/Mexico_City')
                        ->toDateTimeString(),
                    'updated_at' => Carbon::parse($item->updated_at, 'UTC')
                        ->timezone('America/Mexico_City')
                        ->toDateTimeString(),
                ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('orders')
            ->orderBy('created_at')
            ->lazy()
            ->each(function ($order) {
                DB::table('orders')->where('id', $order->id)->update([
                    'created_at' => Carbon::parse($order->created_at, 'America/Mexico_City')
                        ->timezone('UTC')
                        ->toDateTimeString(),
                    'updated_at' => Carbon::parse($order->updated_at, 'America/Mexico_City')
                        ->timezone('UTC')
                        ->toDateTimeString(),
                ]);
            });

        DB::table('order_items')
            ->orderBy('created_at')
            ->lazy()
            ->each(function ($item) {
                DB::table('order_items')->where('id', $item->id)->update([
                    'created_at' => Carbon::parse($item->created_at, 'America/Mexico_City')
                        ->timezone('UTC')
                        ->toDateTimeString(),
                    'updated_at' => Carbon::parse($item->updated_at, 'America/Mexico_City')
                        ->timezone('UTC')
                        ->toDateTimeString(),
                ]);
            });
    }
};
