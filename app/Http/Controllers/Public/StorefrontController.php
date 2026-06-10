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
            ->whereHas('products', fn ($query) => $query->where('is_active', true))
            ->with([
                'products' => fn ($query) => $query
                    ->where('is_active', true)
                    ->with([
                        'variants' => fn ($query) => $query
                            ->where('is_active', true)
                            ->orderBy('sort_order'),
                    ])
                    ->orderBy('sort_order'),
            ])
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('Public/Storefront', [
            'organization' => $organization->only([
                'id',
                'name',
                'slug',
                'description',
                'phone',
                'logo',
                'address',
                'city',
            ]),
            'categories' => $categories,
        ]);
    }
}
