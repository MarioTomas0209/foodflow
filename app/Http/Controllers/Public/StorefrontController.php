<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\DailyMenu;
use App\Models\DailyMenuItem;
use App\Models\Organization;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontController extends Controller
{
    public function show(string $slug): Response
    {
        $organization = Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $categories = $organization
            ->categories()
            ->where('is_active', true)
            ->whereHas('products', fn ($query) => $query
                ->where('is_active', true)
                ->where(fn ($query) => $query
                    ->where('has_variants', true)
                    ->orWhere(fn ($query) => $query->whereNull('stock')->orWhere('stock', '>', 0))
                ))
            ->with([
                'products' => fn ($query) => $query
                    ->where('is_active', true)
                    ->where(fn ($query) => $query
                        ->where('has_variants', true)
                        ->orWhere(fn ($query) => $query->whereNull('stock')->orWhere('stock', '>', 0))
                    )
                    ->with([
                        'variants' => fn ($query) => $query
                            ->where('is_active', true)
                            ->orderBy('sort_order'),
                    ])
                    ->orderBy('sort_order'),
            ])
            ->orderBy('sort_order')
            ->get()
            ->each(function ($category) {
                $category->products->each(function ($product) {
                    $product->setAttribute('image', $product->imagePublicUrl());
                });
                $category->setAttribute('is_available_now', $category->isAvailableNow());
                $category->setAttribute('can_order_now', $category->canOrderNow());
            });

        return Inertia::render('Public/Storefront', [
            'organization' => array_merge($organization->only([
                'id',
                'name',
                'slug',
                'description',
                'phone',
                'address',
                'city',
            ]), [
                'logo' => $organization->logoPublicUrl(),
                'hours' => $organization->hours()->orderBy('day_of_week')->get([
                    'day_of_week', 'opens_at', 'closes_at', 'is_closed',
                ]),
                'is_open_now' => $organization->isOpenNow(),
                'has_delivery' => $organization->deliveryZones()->where('is_active', true)->exists(),
            ]),
            'daily_menu' => $this->formatDailyMenuForStorefront($organization->todayMenu()),
            'categories' => $categories,
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function formatDailyMenuForStorefront(?DailyMenu $menu): ?array
    {
        if ($menu === null) {
            return null;
        }

        return [
            'id' => $menu->id,
            'date' => $menu->date->format('Y-m-d'),
            'name' => $menu->name,
            'available_from' => $menu->available_from,
            'available_until' => $menu->available_until,
            'is_available_now' => $menu->isAvailableNow(),
            'can_order_now' => $menu->canOrderNow(),
            'items' => $menu->items->map(fn (DailyMenuItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'description' => $item->description,
                'has_variants' => $item->has_variants,
                'price' => $item->price,
                'stock' => $item->stock,
                'sort_order' => $item->sort_order,
                'image' => $item->imagePublicUrl(),
                'is_available' => $item->isAvailable(),
                'variants' => $item->variants->map(fn ($variant) => [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'price' => $variant->price,
                    'stock' => $variant->stock,
                    'sort_order' => $variant->sort_order,
                ])->values(),
            ])->values(),
        ];
    }
}
