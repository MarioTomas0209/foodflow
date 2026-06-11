<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
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
            ]),
            'categories' => $categories,
        ]);
    }
}
