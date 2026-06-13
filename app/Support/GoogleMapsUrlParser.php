<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
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

    private const NOMINATIM_USER_AGENT = 'FoodFlow/1.0 (https://foodflow.bookzy.mx; delivery maps resolver)';

    /** Rough bounds for Mexico — filters datacenter-biased defaults from US servers. */
    private const MEXICO_BOUNDS = [
        'min_lat' => 14.5,
        'max_lat' => 32.8,
        'min_lng' => -118.5,
        'max_lng' => -86.5,
    ];

    /** Default bias for Comitán de Domínguez when no organization zones are available. */
    private const DEFAULT_GEOCODE_CONTEXT = [
        'bias_lat' => 16.2489,
        'bias_lng' => -92.1345,
        'bias_radius_km' => 20.0,
    ];

    public static function isShareUrl(string $input): bool
    {
        $url = self::normalizeUrl(trim($input));

        return $url !== null && self::isAllowedUrl($url);
    }

    /**
     * @param  array{
     *   bias_lat?: float,
     *   bias_lng?: float,
     *   bias_radius_km?: float,
     *   zones?: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>
     * }|null  $context
     * @return array{latitude: float, longitude: float}|null
     */
    public static function parse(string $input, ?array $context = null): ?array
    {
        $geocodeContext = self::resolveGeocodeContext($context);
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

        $parsed = self::fetchCoordinatesManually($url, $geocodeContext);

        if ($parsed !== null) {
            return $parsed;
        }

        return self::fetchFollowingRedirects($url, $geocodeContext);
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function fetchFollowingRedirects(string $url, array $context): ?array
    {
        try {
            $response = self::httpClient(followRedirects: true)->get(self::localizeGoogleMapsUrl($url));
            $effectiveUrl = (string) ($response->effectiveUri() ?? $url);

            $parsed = self::parseUrlString($effectiveUrl);

            if ($parsed !== null) {
                return $parsed;
            }

            if ($response->successful()) {
                $parsed = self::parseEmbeddedCoords($response->body());

                if ($parsed !== null) {
                    return $parsed;
                }
            }

            return self::geocodeFromMapsUrl($effectiveUrl, $context);
        } catch (\Throwable $exception) {
            Log::warning('Google Maps auto-redirect fetch failed', [
                'url' => $url,
                'error' => $exception->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function fetchCoordinatesManually(string $url, array $context): ?array
    {
        $current = $url;
        $lastGoogleMapsUrl = null;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            if (! self::isAllowedUrl($current)) {
                break;
            }

            if (self::isGoogleMapsUrl($current)) {
                $lastGoogleMapsUrl = $current;
            }

            try {
                $response = self::httpClient()->get(self::localizeGoogleMapsUrl($current));
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

                $resolvedLocation = self::resolveLocation($current, $location);

                if (self::isGoogleMapsUrl($resolvedLocation)) {
                    $lastGoogleMapsUrl = $resolvedLocation;
                }

                $parsed = self::parseUrlString($resolvedLocation);

                if ($parsed !== null) {
                    return $parsed;
                }

                $current = $resolvedLocation;

                continue;
            }

            break;
        }

        if ($lastGoogleMapsUrl !== null) {
            return self::geocodeFromMapsUrl($lastGoogleMapsUrl, $context);
        }

        return null;
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function geocodeFromMapsUrl(string $url, array $context): ?array
    {
        $parsed = self::parseUrlString($url);

        if ($parsed !== null) {
            return $parsed;
        }

        $query = self::extractPlaceQueryFromMapsUrl($url);

        if ($query === null) {
            return null;
        }

        return self::geocodePlaceQuery($query, $context);
    }

    private static function extractPlaceQueryFromMapsUrl(string $url): ?string
    {
        $decoded = urldecode($url);

        if (preg_match('#/maps/place/([^/@]+)#', $decoded, $matches)) {
            $place = trim(str_replace('+', ' ', $matches[1]));

            return $place !== '' ? $place : null;
        }

        if (preg_match('#/maps/search/([^/@]+)#', $decoded, $matches)) {
            $place = trim(str_replace('+', ' ', $matches[1]));

            return $place !== '' ? $place : null;
        }

        return null;
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function geocodePlaceQuery(string $query, array $context): ?array
    {
        $normalizedQuery = mb_strtolower(trim($query));

        if ($normalizedQuery === '') {
            return null;
        }

        $hasGoogleApiKey = is_string(config('services.google_maps.api_key')) && config('services.google_maps.api_key') !== '';
        $cacheKey = 'google_maps_geocode:v4:'.md5(
            $normalizedQuery.'|'.round($context['bias_lat'], 3).','.round($context['bias_lng'], 3).'|'.($hasGoogleApiKey ? 'google' : 'osm'),
        );
        $cached = Cache::get($cacheKey);

        if (is_array($cached) && isset($cached['latitude'], $cached['longitude'])) {
            return $cached;
        }

        $coords = self::textSearchWithGoogle($query, $context)
            ?? self::findPlaceWithGoogle($query, $context)
            ?? self::geocodeWithGoogle($query, $context)
            ?? self::geocodeWithNominatim($query, $context);

        if ($coords !== null) {
            Cache::put($cacheKey, $coords, now()->addDay());
        }

        return $coords;
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function textSearchWithGoogle(string $query, array $context): ?array
    {
        $apiKey = config('services.google_maps.api_key');

        if (! is_string($apiKey) || $apiKey === '') {
            return null;
        }

        $biasLat = $context['bias_lat'];
        $biasLng = $context['bias_lng'];
        $radiusMeters = (int) min(max($context['bias_radius_km'] * 1000, 5000), 50000);

        try {
            $response = self::httpClient()
                ->get('https://maps.googleapis.com/maps/api/place/textsearch/json', [
                    'query' => $query,
                    'location' => sprintf('%s,%s', $biasLat, $biasLng),
                    'radius' => $radiusMeters,
                    'region' => 'mx',
                    'language' => 'es',
                    'key' => $apiKey,
                ]);

            if (! $response->successful()) {
                return null;
            }

            self::logGoogleApiStatus('Places Text Search', $response->json('status'), $response->json('error_message'));

            $results = $response->json('results');

            if (! is_array($results) || $results === []) {
                return null;
            }

            $coordsList = [];

            foreach ($results as $result) {
                $location = $result['geometry']['location'] ?? null;

                if (! is_array($location)) {
                    continue;
                }

                $coords = self::coordsFromPair(
                    (float) ($location['lat'] ?? 0),
                    (float) ($location['lng'] ?? 0),
                );

                if ($coords !== null) {
                    $coordsList[] = $coords;
                }
            }

            return self::selectBestGeocodeCandidate($coordsList, $context);
        } catch (\Throwable $exception) {
            Log::warning('Google Places Text Search failed', [
                'query' => $query,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function findPlaceWithGoogle(string $query, array $context): ?array
    {
        $apiKey = config('services.google_maps.api_key');

        if (! is_string($apiKey) || $apiKey === '') {
            return null;
        }

        $biasLat = $context['bias_lat'];
        $biasLng = $context['bias_lng'];
        $radiusMeters = (int) min(max($context['bias_radius_km'] * 1000, 5000), 50000);

        try {
            $response = self::httpClient()
                ->get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', [
                    'input' => $query,
                    'inputtype' => 'textquery',
                    'fields' => 'geometry,name,formatted_address',
                    'locationbias' => sprintf('circle:%d@%s,%s', $radiusMeters, $biasLat, $biasLng),
                    'key' => $apiKey,
                ]);

            if (! $response->successful()) {
                return null;
            }

            self::logGoogleApiStatus('Places Find Place', $response->json('status'), $response->json('error_message'));

            $candidates = $response->json('candidates');

            if (! is_array($candidates) || $candidates === []) {
                return null;
            }

            $coordsList = [];

            foreach ($candidates as $candidate) {
                $location = $candidate['geometry']['location'] ?? null;

                if (! is_array($location)) {
                    continue;
                }

                $coords = self::coordsFromPair(
                    (float) ($location['lat'] ?? 0),
                    (float) ($location['lng'] ?? 0),
                );

                if ($coords !== null) {
                    $coordsList[] = $coords;
                }
            }

            return self::selectBestGeocodeCandidate($coordsList, $context);
        } catch (\Throwable $exception) {
            Log::warning('Google Places API failed', [
                'query' => $query,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function geocodeWithGoogle(string $query, array $context): ?array
    {
        $apiKey = config('services.google_maps.api_key');

        if (! is_string($apiKey) || $apiKey === '') {
            return null;
        }

        $biasLat = $context['bias_lat'];
        $biasLng = $context['bias_lng'];
        $biasRadius = $context['bias_radius_km'];
        $latDelta = $biasRadius / 111.0;
        $lngDelta = $biasRadius / (111.0 * cos(deg2rad($biasLat)));

        try {
            $response = self::httpClient()
                ->get('https://maps.googleapis.com/maps/api/geocode/json', [
                    'address' => $query,
                    'key' => $apiKey,
                    'region' => 'mx',
                    'language' => 'es',
                    'components' => 'country:MX',
                    'bounds' => sprintf(
                        '%s,%s|%s,%s',
                        $biasLat - $latDelta,
                        $biasLng - $lngDelta,
                        $biasLat + $latDelta,
                        $biasLng + $lngDelta,
                    ),
                ]);

            if (! $response->successful()) {
                return null;
            }

            self::logGoogleApiStatus('Geocoding', $response->json('status'), $response->json('error_message'));

            $results = $response->json('results');

            if (! is_array($results) || $results === []) {
                return null;
            }

            $candidates = [];

            foreach ($results as $result) {
                $location = $result['geometry']['location'] ?? null;

                if (! is_array($location)) {
                    continue;
                }

                $coords = self::coordsFromPair(
                    (float) ($location['lat'] ?? 0),
                    (float) ($location['lng'] ?? 0),
                );

                if ($coords !== null) {
                    $candidates[] = $coords;
                }
            }

            return self::selectBestGeocodeCandidate($candidates, $context);
        } catch (\Throwable $exception) {
            Log::warning('Google Geocoding API failed', [
                'query' => $query,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function geocodeWithNominatim(string $query, array $context): ?array
    {
        $biasLat = $context['bias_lat'];
        $biasLng = $context['bias_lng'];
        $biasRadius = $context['bias_radius_km'];
        $latDelta = $biasRadius / 111.0;
        $lngDelta = $biasRadius / (111.0 * cos(deg2rad($biasLat)));
        $viewbox = sprintf(
            '%s,%s,%s,%s',
            $biasLng - $lngDelta,
            $biasLat + $latDelta,
            $biasLng + $lngDelta,
            $biasLat - $latDelta,
        );

        foreach ([true, false] as $bounded) {
            try {
                $params = [
                    'q' => $query,
                    'format' => 'json',
                    'limit' => 5,
                    'countrycodes' => 'mx',
                ];

                if ($bounded) {
                    $params['viewbox'] = $viewbox;
                    $params['bounded'] = 1;
                }

                $response = Http::timeout(15)
                    ->withHeaders([
                        'User-Agent' => self::NOMINATIM_USER_AGENT,
                        'Accept' => 'application/json',
                    ])
                    ->retry(1, 300)
                    ->get('https://nominatim.openstreetmap.org/search', $params);

                if (! $response->successful()) {
                    continue;
                }

                $results = $response->json();

                if (! is_array($results) || $results === []) {
                    continue;
                }

                $candidates = [];

                foreach ($results as $result) {
                    $coords = self::coordsFromPair(
                        (float) ($result['lat'] ?? 0),
                        (float) ($result['lon'] ?? 0),
                    );

                    if ($coords !== null) {
                        $candidates[] = $coords;
                    }
                }

                $selected = self::selectBestGeocodeCandidate($candidates, $context);

                if ($selected !== null) {
                    return $selected;
                }
            } catch (\Throwable $exception) {
                Log::warning('Nominatim geocoding failed', [
                    'query' => $query,
                    'bounded' => $bounded,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return null;
    }

    /**
     * @param  list<array{latitude: float, longitude: float}>  $candidates
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function selectBestGeocodeCandidate(array $candidates, array $context): ?array
    {
        $inMexico = array_values(array_filter(
            $candidates,
            fn (array $coords) => self::isWithinMexico($coords['latitude'], $coords['longitude']),
        ));

        if ($inMexico === []) {
            return null;
        }

        $zones = $context['zones'];

        if ($zones !== []) {
            $insideZone = array_values(array_filter(
                $inMexico,
                fn (array $coords) => self::matchesAnyDeliveryZone($coords, $zones),
            ));

            if ($insideZone !== []) {
                return self::closestToBias($insideZone, $context);
            }
        }

        $withinBias = array_values(array_filter(
            $inMexico,
            fn (array $coords) => self::distanceKm(
                $coords['latitude'],
                $coords['longitude'],
                $context['bias_lat'],
                $context['bias_lng'],
            ) <= $context['bias_radius_km'],
        ));

        return self::closestToBias($withinBias !== [] ? $withinBias : $inMexico, $context);
    }

    /**
     * @param  list<array{latitude: float, longitude: float}>  $candidates
     * @param  array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}  $context
     * @return array{latitude: float, longitude: float}|null
     */
    private static function closestToBias(array $candidates, array $context): ?array
    {
        if ($candidates === []) {
            return null;
        }

        usort(
            $candidates,
            fn (array $left, array $right) => self::distanceKm(
                $left['latitude'],
                $left['longitude'],
                $context['bias_lat'],
                $context['bias_lng'],
            ) <=> self::distanceKm(
                $right['latitude'],
                $right['longitude'],
                $context['bias_lat'],
                $context['bias_lng'],
            ),
        );

        return $candidates[0];
    }

    /**
     * @param  list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>  $zones
     */
    private static function matchesAnyDeliveryZone(array $coords, array $zones): bool
    {
        foreach ($zones as $zone) {
            if (self::distanceKm(
                $coords['latitude'],
                $coords['longitude'],
                (float) $zone['center_lat'],
                (float) $zone['center_lng'],
            ) <= (float) $zone['radius_km']) {
                return true;
            }
        }

        return false;
    }

    private static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371;
        $latFrom = deg2rad($lat1);
        $lngFrom = deg2rad($lng1);
        $latTo = deg2rad($lat2);
        $lngTo = deg2rad($lng2);
        $latDelta = $latTo - $latFrom;
        $lngDelta = $lngTo - $lngFrom;
        $angle = 2 * asin(sqrt(
            sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lngDelta / 2) ** 2
        ));

        return $angle * $earthRadiusKm;
    }

    /**
     * @param  array{
     *   bias_lat?: float,
     *   bias_lng?: float,
     *   bias_radius_km?: float,
     *   zones?: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>
     * }|null  $context
     * @return array{bias_lat: float, bias_lng: float, bias_radius_km: float, zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>}
     */
    private static function resolveGeocodeContext(?array $context): array
    {
        $resolved = array_merge(self::DEFAULT_GEOCODE_CONTEXT, $context ?? []);
        $resolved['zones'] = $context['zones'] ?? [];

        return [
            'bias_lat' => (float) $resolved['bias_lat'],
            'bias_lng' => (float) $resolved['bias_lng'],
            'bias_radius_km' => (float) $resolved['bias_radius_km'],
            'zones' => $resolved['zones'],
        ];
    }

    private static function logGoogleApiStatus(string $api, mixed $status, mixed $errorMessage): void
    {
        if (! is_string($status) || in_array($status, ['OK', 'ZERO_RESULTS'], true)) {
            return;
        }

        Log::warning("Google {$api} API response", [
            'status' => $status,
            'error' => is_string($errorMessage) ? $errorMessage : null,
        ]);
    }

    private static function localizeGoogleMapsUrl(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);

        if (! is_string($host) || ! str_ends_with(strtolower($host), 'google.com')) {
            return $url;
        }

        if (preg_match('/[?&](gl|hl)=/i', $url)) {
            return $url;
        }

        return $url.(str_contains($url, '?') ? '&' : '?').'gl=mx&hl=es-MX';
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
        $found = [];

        foreach ($candidates as $candidate) {
            self::collectPatternMatches($candidate, [
                ['regex' => '/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/', 'lat' => 1, 'lng' => 2, 'priority' => 100, 'require_mexico' => false],
                ['regex' => '/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/', 'lat' => 2, 'lng' => 1, 'priority' => 100, 'require_mexico' => false],
                ['regex' => '/%213d(-?\d+(?:\.\d+)?)%214d(-?\d+(?:\.\d+)?)/', 'lat' => 1, 'lng' => 2, 'priority' => 100, 'require_mexico' => false],
                ['regex' => '/%212d(-?\d+(?:\.\d+)?)%213d(-?\d+(?:\.\d+)?)/', 'lat' => 2, 'lng' => 1, 'priority' => 100, 'require_mexico' => false],
                ['regex' => '/0x[a-f0-9]+:0x[a-f0-9]+.{0,1200}"mx",\[\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/i', 'lat' => 3, 'lng' => 2, 'priority' => 80, 'require_mexico' => true],
                ['regex' => '/"mx",\[\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\]/', 'lat' => 3, 'lng' => 2, 'priority' => 20, 'require_mexico' => true],
                ['regex' => '/\[\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\],\[0,0,0\]/', 'lat' => 3, 'lng' => 2, 'priority' => 20, 'require_mexico' => true],
            ], $found);
        }

        return self::selectBestCoords($found);
    }

    /**
     * @param  list<array{coords: array{latitude: float, longitude: float}, priority: int}>  $found
     * @param  list<array{regex: string, lat: int, lng: int, priority: int, require_mexico: bool}>  $patterns
     */
    private static function collectPatternMatches(string $candidate, array $patterns, array &$found): void
    {
        foreach ($patterns as $pattern) {
            if (! preg_match_all($pattern['regex'], $candidate, $matches, PREG_SET_ORDER)) {
                continue;
            }

            foreach ($matches as $match) {
                $coords = self::coordsFromPair(
                    (float) $match[$pattern['lat']],
                    (float) $match[$pattern['lng']],
                );

                if ($coords === null) {
                    continue;
                }

                if ($pattern['require_mexico'] && ! self::isWithinMexico($coords['latitude'], $coords['longitude'])) {
                    continue;
                }

                $found[] = [
                    'coords' => $coords,
                    'priority' => $pattern['priority'],
                ];
            }
        }
    }

    /**
     * @param  list<array{coords: array{latitude: float, longitude: float}, priority: int}>  $found
     * @return array{latitude: float, longitude: float}|null
     */
    private static function selectBestCoords(array $found): ?array
    {
        if ($found === []) {
            return null;
        }

        usort($found, fn (array $left, array $right) => $right['priority'] <=> $left['priority']);

        return $found[0]['coords'];
    }

    private static function isWithinMexico(float $latitude, float $longitude): bool
    {
        return $latitude >= self::MEXICO_BOUNDS['min_lat']
            && $latitude <= self::MEXICO_BOUNDS['max_lat']
            && $longitude >= self::MEXICO_BOUNDS['min_lng']
            && $longitude <= self::MEXICO_BOUNDS['max_lng'];
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

    private static function isGoogleMapsUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);

        if (! is_string($host) || $host === '') {
            return false;
        }

        $host = strtolower($host);

        return $host === 'maps.google.com'
            || $host === 'www.google.com'
            || $host === 'google.com'
            || str_ends_with($host, '.google.com');
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
