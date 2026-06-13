<?php

use App\Support\GoogleMapsUrlParser;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('maps:resolve {url}', function (string $url) {
    $coords = GoogleMapsUrlParser::parse($url);

    if ($coords === null) {
        $this->error('No se pudieron extraer coordenadas.');
        $this->line('El servidor sigue el enlace goo.gl, lee el nombre del lugar y lo geocodifica (Nominatim o Google Geocoding API).');
        $this->line('Opcional: define GOOGLE_MAPS_API_KEY en .env para mayor precisión.');
        $this->line('Tras desplegar cambios de geocodificación, ejecuta: php artisan cache:clear');

        return 1;
    }

    $this->info(sprintf('Latitud: %s', $coords['latitude']));
    $this->info(sprintf('Longitud: %s', $coords['longitude']));

    return 0;
})->purpose('Probar resolución de enlaces de Google Maps desde el servidor');
