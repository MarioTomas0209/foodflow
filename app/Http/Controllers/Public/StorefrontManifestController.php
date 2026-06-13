<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Support\StorefrontPwaAssetGenerator;
use Illuminate\Http\JsonResponse;

class StorefrontManifestController extends Controller
{
    public function __construct(private StorefrontPwaAssetGenerator $assets) {}

    public function show(string $slug): JsonResponse
    {
        $organization = Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $icons = [
            [
                'src' => "/{$slug}/pwa/icon-192.png",
                'sizes' => '192x192',
                'type' => 'image/png',
                'purpose' => 'any',
            ],
            [
                'src' => "/{$slug}/pwa/icon-512.png",
                'sizes' => '512x512',
                'type' => 'image/png',
                'purpose' => 'any',
            ],
            [
                'src' => "/{$slug}/pwa/icon-maskable.png",
                'sizes' => '512x512',
                'type' => 'image/png',
                'purpose' => 'maskable',
            ],
        ];

        $shortName = mb_strlen($organization->name) > 12
            ? mb_substr($organization->name, 0, 12).'…'
            : $organization->name;

        return response()->json([
            'id' => "/{$slug}",
            'name' => $organization->name,
            'short_name' => $shortName,
            'description' => $organization->description ?: "Pedidos en línea de {$organization->name}",
            'start_url' => "/{$slug}",
            'scope' => "/{$slug}/",
            'display' => 'standalone',
            'orientation' => 'portrait',
            'background_color' => '#ffffff',
            'theme_color' => '#f97316',
            'lang' => 'es-MX',
            'icons' => $icons,
        ], 200, [
            'Content-Type' => 'application/manifest+json',
        ]);
    }
}
