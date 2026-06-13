<?php

use App\Support\GoogleMapsUrlParser;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('maps:resolve {url} {--debug}', function (string $url) {
    $apiKey = config('services.google_maps.api_key');

    if ($this->option('debug')) {
        $this->line('GOOGLE_MAPS_API_KEY: '.(is_string($apiKey) && $apiKey !== '' ? 'configurada' : 'NO CONFIGURADA'));
        $this->line('APP_ENV: '.config('app.env'));

        if (is_string($apiKey) && $apiKey !== '') {
            $testQuery = 'El Arenal, Comitán de Domínguez, Chiapas, México';

            try {
                $response = Http::timeout(15)
                    ->get('https://maps.googleapis.com/maps/api/geocode/json', [
                        'address' => $testQuery,
                        'key' => $apiKey,
                        'region' => 'mx',
                        'language' => 'es',
                        'components' => 'country:MX',
                    ]);

                $this->line('Geocoding API status: '.($response->json('status') ?? 'sin respuesta'));
                $error = $response->json('error_message');

                if (is_string($error) && $error !== '') {
                    $this->warn('Geocoding API error: '.$error);
                }

                $location = $response->json('results.0.geometry.location');

                if (is_array($location)) {
                    $this->line(sprintf(
                        'Geocoding test coords: %s, %s',
                        $location['lat'] ?? '?',
                        $location['lng'] ?? '?',
                    ));
                }
            } catch (\Throwable $exception) {
                $this->warn('No se pudo contactar Geocoding API: '.$exception->getMessage());
            }
        }

        $this->newLine();
    }

    $coords = GoogleMapsUrlParser::parse($url);

    if ($coords === null) {
        $this->error('No se pudieron extraer coordenadas.');
        $this->line('El servidor sigue el enlace goo.gl, lee el nombre del lugar y lo geocodifica (Google Places/Geocoding o Nominatim).');
        $this->line('Opcional: define GOOGLE_MAPS_API_KEY en .env para mayor precisión.');
        $this->line('Tras cambios: php artisan config:clear && php artisan cache:clear');
        $this->line('Diagnóstico: php artisan maps:resolve "URL" --debug');

        return 1;
    }

    $this->info(sprintf('Latitud: %s', $coords['latitude']));
    $this->info(sprintf('Longitud: %s', $coords['longitude']));

    if ($this->option('debug')) {
        $this->newLine();
        $this->line('Referencia local esperada (aprox.): 16.243098, -92.133786');

        $latDiff = abs($coords['latitude'] - 16.243098);
        $lngDiff = abs($coords['longitude'] - (-92.133786));

        if ($latDiff > 0.002 || $lngDiff > 0.002) {
            $this->warn('Las coordenadas difieren de local. Si la API key está configurada, ejecuta cache:clear y revisa storage/logs/laravel.log');
        }
    }

    return 0;
})->purpose('Probar resolución de enlaces de Google Maps desde el servidor');
