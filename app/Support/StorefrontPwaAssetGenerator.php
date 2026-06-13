<?php

namespace App\Support;

use App\Models\Organization;
use GdImage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class StorefrontPwaAssetGenerator
{
    private const CACHE_DIR = 'pwa';

    /**
     * @return list<array{width: int, height: int, media: string}>
     */
    public static function splashPresets(): array
    {
        return [
            [
                'width' => 1284,
                'height' => 2778,
                'media' => '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
            ],
            [
                'width' => 1170,
                'height' => 2532,
                'media' => '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
            ],
            [
                'width' => 750,
                'height' => 1334,
                'media' => '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
            ],
        ];
    }

    public function ensureIconForResponse(Organization $organization, int $size, bool $maskable = false): ?string
    {
        return $this->ensureIcon($organization, $size, $maskable);
    }

    public function ensureSplashForResponse(Organization $organization, int $width, int $height): ?string
    {
        return $this->ensureSplash($organization, $width, $height);
    }

    public function iconRelativePath(Organization $organization, int $size, bool $maskable = false): string
    {
        $generated = $this->ensureIcon($organization, $size, $maskable);

        if ($generated !== null) {
            return '/storage/'.$generated;
        }

        return $maskable ? '/icons/icon-512.png' : "/icons/icon-{$size}.png";
    }

    public function splashRelativePath(Organization $organization, int $width, int $height): ?string
    {
        $generated = $this->ensureSplash($organization, $width, $height);

        return $generated !== null ? '/storage/'.$generated : null;
    }

    public function clearCache(Organization $organization): void
    {
        Storage::disk('public')->deleteDirectory(self::CACHE_DIR.'/'.$organization->id);
    }

    private function ensureIcon(Organization $organization, int $size, bool $maskable = false): ?string
    {
        if (! extension_loaded('gd')) {
            return null;
        }

        $filename = $maskable ? "icon-{$size}-maskable.png" : "icon-{$size}.png";
        $relativePath = self::CACHE_DIR.'/'.$organization->id.'/'.$filename;
        $disk = Storage::disk('public');

        if ($disk->exists($relativePath)) {
            return $relativePath;
        }

        $binary = $this->renderIcon($organization, $size, $maskable);

        if ($binary === null) {
            return null;
        }

        $disk->makeDirectory(self::CACHE_DIR.'/'.$organization->id);
        $disk->put($relativePath, $binary);

        return $relativePath;
    }

    private function ensureSplash(Organization $organization, int $width, int $height): ?string
    {
        if (! extension_loaded('gd')) {
            return null;
        }

        $relativePath = self::CACHE_DIR.'/'.$organization->id."/splash-{$width}x{$height}.png";
        $disk = Storage::disk('public');

        if ($disk->exists($relativePath)) {
            return $relativePath;
        }

        $binary = $this->renderSplash($organization, $width, $height);

        if ($binary === null) {
            return null;
        }

        $disk->makeDirectory(self::CACHE_DIR.'/'.$organization->id);
        $disk->put($relativePath, $binary);

        return $relativePath;
    }

    private function renderIcon(Organization $organization, int $size, bool $maskable): ?string
    {
        $source = $this->loadSourceImage($organization);

        if (! $source instanceof GdImage) {
            return null;
        }

        $paddingRatio = $maskable ? 0.18 : 0.1;
        $padding = (int) round($size * $paddingRatio);
        $canvas = imagecreatetruecolor($size, $size);

        if ($canvas === false) {
            imagedestroy($source);

            return null;
        }

        $background = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $background);

        $this->drawContainedImage($canvas, $source, $size, $padding);
        imagedestroy($source);

        return $this->encodePng($canvas);
    }

    private function renderSplash(Organization $organization, int $width, int $height): ?string
    {
        $source = $this->loadSourceImage($organization);

        if (! $source instanceof GdImage) {
            return null;
        }

        $canvas = imagecreatetruecolor($width, $height);

        if ($canvas === false) {
            imagedestroy($source);

            return null;
        }

        $background = imagecolorallocate($canvas, 255, 255, 255);
        imagefill($canvas, 0, 0, $background);

        $accent = imagecolorallocate($canvas, 249, 115, 22);
        imagefilledellipse($canvas, (int) ($width / 2), (int) ($height * 0.42), (int) ($width * 0.72), (int) ($width * 0.72), $accent);

        $logoBox = (int) round(min($width, $height) * 0.34);
        $padding = (int) round($logoBox * 0.12);
        $logoCanvas = imagecreatetruecolor($logoBox, $logoBox);

        if ($logoCanvas === false) {
            imagedestroy($source);
            imagedestroy($canvas);

            return null;
        }

        $logoBackground = imagecolorallocate($logoCanvas, 255, 255, 255);
        imagefill($logoCanvas, 0, 0, $logoBackground);
        $this->drawContainedImage($logoCanvas, $source, $logoBox, $padding);
        imagedestroy($source);

        $logoX = (int) (($width - $logoBox) / 2);
        $logoY = (int) (($height * 0.42) - ($logoBox / 2));
        imagecopy($canvas, $logoCanvas, $logoX, $logoY, 0, 0, $logoBox, $logoBox);
        imagedestroy($logoCanvas);

        $textColor = imagecolorallocate($canvas, 23, 23, 23);
        $this->drawCenteredText($canvas, $this->truncateName($organization->name, 24), (int) ($height * 0.62), $textColor, 5);

        $subtitleColor = imagecolorallocate($canvas, 115, 115, 115);
        $this->drawCenteredText($canvas, 'Pedidos en línea', (int) ($height * 0.66), $subtitleColor, 3);

        return $this->encodePng($canvas);
    }

    private function drawContainedImage(GdImage $canvas, GdImage $source, int $size, int $padding): void
    {
        $srcWidth = imagesx($source);
        $srcHeight = imagesy($source);
        $inner = $size - ($padding * 2);
        $scale = min($inner / $srcWidth, $inner / $srcHeight);
        $targetWidth = (int) round($srcWidth * $scale);
        $targetHeight = (int) round($srcHeight * $scale);
        $targetX = (int) round(($size - $targetWidth) / 2);
        $targetY = (int) round(($size - $targetHeight) / 2);

        imagealphablending($canvas, true);
        imagesavealpha($canvas, true);
        imagecopyresampled(
            $canvas,
            $source,
            $targetX,
            $targetY,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $srcWidth,
            $srcHeight,
        );
    }

    private function drawCenteredText(GdImage $canvas, string $text, int $baselineY, int $color, int $font): void
    {
        $textWidth = imagefontwidth($font) * strlen($text);
        $textX = (int) max(16, (imagesx($canvas) - $textWidth) / 2);

        imagestring($canvas, $font, $textX, $baselineY, $text, $color);
    }

    private function truncateName(string $name, int $maxLength): string
    {
        if (mb_strlen($name) <= $maxLength) {
            return $name;
        }

        return mb_substr($name, 0, $maxLength - 1).'…';
    }

    private function loadSourceImage(Organization $organization): ?GdImage
    {
        if ($organization->logo === null) {
            return $this->loadFallbackImage();
        }

        if (str_starts_with($organization->logo, 'http://') || str_starts_with($organization->logo, 'https://')) {
            try {
                $response = Http::timeout(10)->get($organization->logo);
            } catch (\Throwable) {
                return $this->loadFallbackImage();
            }

            if (! $response->successful()) {
                return $this->loadFallbackImage();
            }

            $image = @imagecreatefromstring($response->body());

            return $image instanceof GdImage ? $image : $this->loadFallbackImage();
        }

        $disk = Storage::disk('public');

        if (! $disk->exists($organization->logo)) {
            return $this->loadFallbackImage();
        }

        $path = $disk->path($organization->logo);
        $image = $this->createImageFromPath($path);

        return $image instanceof GdImage ? $image : $this->loadFallbackImage();
    }

    private function loadFallbackImage(): ?GdImage
    {
        $fallbackPath = public_path('icons/icon-512.png');

        if (! is_file($fallbackPath)) {
            return null;
        }

        $image = $this->createImageFromPath($fallbackPath);

        return $image instanceof GdImage ? $image : null;
    }

    private function createImageFromPath(string $path): ?GdImage
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($extension) {
            'png' => @imagecreatefrompng($path) ?: null,
            'jpg', 'jpeg' => @imagecreatefromjpeg($path) ?: null,
            'webp' => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
            default => null,
        };
    }

    private function encodePng(GdImage $canvas): ?string
    {
        ob_start();
        imagepng($canvas);
        $binary = ob_get_clean();
        imagedestroy($canvas);

        return is_string($binary) && $binary !== '' ? $binary : null;
    }
}
