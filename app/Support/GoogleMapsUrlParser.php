<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleMapsUrlParser
{
    private const ALLOWED_HOSTS = [
        'maps.app.goo.gl',
        'goo.gl',
        'maps.google.com',
        'www.google.com',
        'google.com',
    ];

    private const BROWSER_USER_AGENT = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';

    public static function isShareUrl(string $input): bool
    {
        $url = self::normalizeUrl(trim($input));

        return $url !== null && self::isAllowedUrl($url);
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    public static function parse(string $input): ?array
    {
        $trimmed = trim($input);

        if ($trimmed === '') {
            return null;
        }

        $url = self::normalizeUrl($trimmed);

        if ($url === null) {
            return null;
        }

        $url = self::normalizeShareUrl($url);

        $parsed = self::parseUrlString($url);

        if ($parsed !== null) {
            return $parsed;
        }

        if (! self::isAllowedUrl($url)) {
            return null;
        }

        $parsed = self::fetchCoordinatesManually($url);

        if ($parsed !== null) {
            return $parsed;
        }

        return self::fetchFollowingRedirects($url);
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    private static function fetchFollowingRedirects(string $url): ?array
    {
        try {
            $response = self::httpClient(followRedirects: true)->get($url);
            $effectiveUrl = (string) ($response->effectiveUri() ?? $url);

            $parsed = self::parseUrlString($effectiveUrl);

            if ($parsed !== null) {
                return $parsed;
            }

            if ($response->successful()) {
                return self::parseEmbeddedCoords($response->body());
            }
        } catch (\Throwable $exception) {
            Log::warning('Google Maps auto-redirect fetch failed', [
                'url' => $url,
                'error' => $exception->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    private static function fetchCoordinatesManually(string $url): ?array
    {
        $current = $url;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            if (! self::isAllowedUrl($current)) {
                break;
            }

            try {
                $response = self::httpClient()->get($current);
            } catch (\Throwable $exception) {
                Log::warning('Google Maps manual fetch failed', [
                    'url' => $current,
                    'error' => $exception->getMessage(),
                ]);

                break;
            }

            $parsed = self::parseUrlString($current);

            if ($parsed !== null) {
                return $parsed;
            }

            if ($response->successful()) {
                $parsed = self::parseEmbeddedCoords($response->body());

                if ($parsed !== null) {
                    return $parsed;
                }
            }

            if ($response->status() >= 300 && $response->status() < 400) {
                $location = $response->header('Location');

                if (! is_string($location) || $location === '') {
                    break;
                }

                $current = self::resolveLocation($current, $location);

                continue;
            }

            break;
        }

        return null;
    }

    private static function normalizeShareUrl(string $url): string
    {
        $parts = parse_url($url);

        if ($parts === false) {
            return $url;
        }

        $host = strtolower($parts['host'] ?? '');

        if ($host === 'maps.app.goo.gl' || $host === 'goo.gl') {
            $path = $parts['path'] ?? '';

            return ($parts['scheme'] ?? 'https').'://'.$host.$path;
        }

        return $url;
    }

    private static function normalizeUrl(string $input): ?string
    {
        if (preg_match('/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/', trim($input))) {
            return trim($input);
        }

        $candidate = preg_match('/^https?:\/\//i', $input) ? $input : "https://{$input}";

        return filter_var($candidate, FILTER_VALIDATE_URL) ? $candidate : null;
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    private static function parseUrlString(string $url): ?array
    {
        $trimmed = trim($url);

        if (preg_match('/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/', $trimmed, $matches)) {
            return self::coordsFromPair((float) $matches[1], (float) $matches[2]);
        }

        $parts = parse_url($trimmed);

        if ($parts === false) {
            return null;
        }

        if (! empty($parts['query'])) {
            parse_str($parts['query'], $query);

            foreach (['q', 'query', 'll', 'center', 'destination'] as $name) {
                if (empty($query[$name]) || ! is_string($query[$name])) {
                    continue;
                }

                $decoded = urldecode(str_replace('+', ' ', $query[$name]));

                if (preg_match('/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/', $decoded, $matches)) {
                    $coords = self::coordsFromPair((float) $matches[1], (float) $matches[2]);

                    if ($coords !== null) {
                        return $coords;
                    }
                }
            }
        }

        if (preg_match('/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/', $trimmed, $matches)) {
            return self::coordsFromPair((float) $matches[1], (float) $matches[2]);
        }

        if (preg_match('/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/', $trimmed, $matches)) {
            return self::coordsFromPair((float) $matches[2], (float) $matches[1]);
        }

        if (! empty($parts['path']) && preg_match('/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/', $parts['path'], $matches)) {
            return self::coordsFromPair((float) $matches[1], (float) $matches[2]);
        }

        if (preg_match('/[?&]q=(-?\d+(?:\.\d+)?)[,%2C](-?\d+(?:\.\d+)?)/i', $trimmed, $matches)) {
            return self::coordsFromPair((float) $matches[1], (float) $matches[2]);
        }

        if (preg_match('#/(?:/|@)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)#', $trimmed, $matches)) {
            return self::coordsFromPair((float) $matches[1], (float) $matches[2]);
        }

        return null;
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    private static function parseEmbeddedCoords(string $content): ?array
    {
        $candidates = [$content, urldecode($content)];

        $patterns = [
            ['regex' => '/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/', 'lat' => 1, 'lng' => 2],
            ['regex' => '/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/', 'lat' => 2, 'lng' => 1],
            ['regex' => '/%213d(-?\d+(?:\.\d+)?)%214d(-?\d+(?:\.\d+)?)/', 'lat' => 1, 'lng' => 2],
            ['regex' => '/%212d(-?\d+(?:\.\d+)?)%213d(-?\d+(?:\.\d+)?)/', 'lat' => 2, 'lng' => 1],
            ['regex' => '/"mx",\[\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/', 'lat' => 3, 'lng' => 2],
            ['regex' => '/\[\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\],\[0,0,0\]/', 'lat' => 3, 'lng' => 2],
        ];

        foreach ($candidates as $candidate) {
            foreach ($patterns as $pattern) {
                if (! preg_match($pattern['regex'], $candidate, $matches)) {
                    continue;
                }

                $coords = self::coordsFromPair(
                    (float) $matches[$pattern['lat']],
                    (float) $matches[$pattern['lng']],
                );

                if ($coords !== null) {
                    return $coords;
                }
            }
        }

        return null;
    }

    /**
     * @return array{latitude: float, longitude: float}|null
     */
    private static function coordsFromPair(float $latitude, float $longitude): ?array
    {
        if (
            ! is_finite($latitude) ||
            ! is_finite($longitude) ||
            $latitude < -90 ||
            $latitude > 90 ||
            $longitude < -180 ||
            $longitude > 180
        ) {
            return null;
        }

        return [
            'latitude' => $latitude,
            'longitude' => $longitude,
        ];
    }

    private static function isAllowedUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return false;
        }

        $host = strtolower($host);

        foreach (self::ALLOWED_HOSTS as $allowed) {
            if ($host === $allowed || str_ends_with($host, '.'.$allowed)) {
                return true;
            }
        }

        return false;
    }

    private static function resolveLocation(string $current, string $location): string
    {
        if (str_starts_with($location, '/')) {
            $parts = parse_url($current);

            return ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '').$location;
        }

        if (! preg_match('/^https?:\/\//i', $location)) {
            $parts = parse_url($current);

            return ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '').'/'.ltrim($location, '/');
        }

        return $location;
    }

    private static function httpClient(bool $followRedirects = false): PendingRequest
    {
        $client = Http::timeout(15)
            ->withHeaders([
                'User-Agent' => self::BROWSER_USER_AGENT,
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'es-MX,es;q=0.9',
            ])
            ->retry(2, 200)
            ->withOptions([
                'allow_redirects' => $followRedirects ? ['max' => 10, 'strict' => false, 'referer' => true] : false,
            ]);

        $shouldVerify = (bool) config('services.google_maps.http_verify', true);

        if (! $shouldVerify || app()->environment('local')) {
            $client = $client->withoutVerifying();
        }

        return $client;
    }
}
