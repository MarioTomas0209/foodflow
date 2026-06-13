<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Support\StorefrontPwaAssetGenerator;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class StorefrontPwaAssetController extends Controller
{
    public function __construct(private StorefrontPwaAssetGenerator $assets) {}

    public function icon(string $slug, int $size): SymfonyResponse
    {
        abort_unless(in_array($size, [192, 512], true), 404);

        return $this->binaryResponse(
            $this->organization($slug),
            fn (Organization $organization) => $this->assets->ensureIconForResponse($organization, $size, false),
            "/icons/icon-{$size}.png",
        );
    }

    public function maskableIcon(string $slug): SymfonyResponse
    {
        return $this->binaryResponse(
            $this->organization($slug),
            fn (Organization $organization) => $this->assets->ensureIconForResponse($organization, 512, true),
            '/icons/icon-512.png',
        );
    }

    public function splash(string $slug, int $width, int $height): SymfonyResponse
    {
        abort_unless($width >= 320 && $width <= 2000 && $height >= 480 && $height <= 3000, 404);

        return $this->binaryResponse(
            $this->organization($slug),
            fn (Organization $organization) => $this->assets->ensureSplashForResponse($organization, $width, $height),
            null,
        );
    }

    private function organization(string $slug): Organization
    {
        return Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();
    }

    /**
     * @param  callable(Organization): ?string  $resolver
     */
    private function binaryResponse(Organization $organization, callable $resolver, ?string $fallbackPublicPath): SymfonyResponse
    {
        $relativePath = $resolver($organization);

        if ($relativePath !== null) {
            $disk = Storage::disk('public');

            if ($disk->exists($relativePath)) {
                return response()->file($disk->path($relativePath), [
                    'Content-Type' => 'image/png',
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                ]);
            }
        }

        if ($fallbackPublicPath !== null && is_file(public_path(ltrim($fallbackPublicPath, '/')))) {
            return response()->file(public_path(ltrim($fallbackPublicPath, '/')), [
                'Content-Type' => 'image/png',
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ]);
        }

        abort(404);
    }
}
