<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Http;

$urls = [
    'https://maps.app.goo.gl/vMnkbZ83nMbpzusD7?g_st=ac',
    'https://maps.app.goo.gl/NcUut5SKowPfppfJ8',
];

foreach ($urls as $url) {
    echo "=== $url ===\n";
    $parsed = App\Support\GoogleMapsUrlParser::parse($url);
    var_export($parsed);
    echo "\n\n";

    $current = $url;
    for ($i = 0; $i < 2; $i++) {
        $response = Http::timeout(15)->withoutVerifying()
            ->withHeaders(['User-Agent' => 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36'])
            ->withOptions(['allow_redirects' => false])
            ->get($current);

        echo "step $i status={$response->status()}\n";
        if ($response->status() >= 300 && $response->status() < 400) {
            $loc = $response->header('Location');
            echo 'location='.substr($loc, 0, 200)."...\n";
            if (preg_match('/@(-?\d+\.\d+),(-?\d+\.\d+)/', $loc, $m)) {
                echo "loc @coords: {$m[1]}, {$m[2]}\n";
            }
            if (preg_match('/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/', $loc, $m)) {
                echo "loc !3d!4d: {$m[1]}, {$m[2]}\n";
            }
            $current = $loc;
            continue;
        }

        $body = $response->body();
        preg_match_all('/"mx",\[\[(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)\]/', $body, $all, PREG_SET_ORDER);
        echo 'mx matches: '.count($all)."\n";
        foreach (array_slice($all, 0, 5) as $m) {
            echo "  {$m[3]}, {$m[2]}\n";
        }
        break;
    }

    echo "\n";
}
