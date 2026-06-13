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
        $this->line('Revisa storage/logs/laravel.log y que el servidor pueda hacer peticiones HTTPS a maps.app.goo.gl y google.com.');

        return 1;
    }

    $this->info(sprintf('Latitud: %s', $coords['latitude']));
    $this->info(sprintf('Longitud: %s', $coords['longitude']));

    return 0;
})->purpose('Probar resolución de enlaces de Google Maps desde el servidor');
