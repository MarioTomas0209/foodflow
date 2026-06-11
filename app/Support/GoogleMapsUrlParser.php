<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

class GoogleMapsUrlParser
{
    private const ALLOWED_HOSTS = [
        'maps.app.goo.gl',
        'goo.gl',
        'maps.google.com',
        'www.google.com',
        'google.com',
    ];

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

        $parsed = self::parseUrlString($url);

        if ($parsed !== null) {
            return $parsed;
        }

        if (! self::isAllowedUrl($url)) {
            return null;
        }

        foreach (self::resolveRedirectChain($url) as $redirectUrl) {
            $parsed = self::parseUrlString($redirectUrl);

            if ($parsed !== null) {
                return $parsed;
            }
        }

        return null;
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

    /**
     * @return list<string>
     */
    private static function resolveRedirectChain(string $url): array
    {
        $chain = [$url];
        $current = $url;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            if (! self::isAllowedUrl($current)) {
                break;
            }

            try {
                $response = self::httpClient()->get($current);
            } catch (\Throwable) {
                break;
            }

            if ($response->status() >= 300 && $response->status() < 400) {
                $location = $response->header('Location');

                if (! is_string($location) || $location === '') {
                    break;
                }

                $current = self::resolveLocation($current, $location);
                $chain[] = $current;

                continue;
            }

            $chain[] = $current;

            break;
        }

        return array_values(array_unique($chain));
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

    private static function httpClient(): \Illuminate\Http\Client\PendingRequest
    {
        $client = Http::timeout(10)->withOptions(['allow_redirects' => false]);

        if (app()->environment('local')) {
            $client = $client->withoutVerifying();
        }

        return $client;
    }
}
