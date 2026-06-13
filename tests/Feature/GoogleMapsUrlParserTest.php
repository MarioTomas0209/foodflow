<?php

use App\Models\Organization;
use App\Models\User;
use App\Support\GoogleMapsUrlParser;
use Illuminate\Support\Facades\Http;

test('google maps url parser reads coordinates from direct input', function () {
    expect(GoogleMapsUrlParser::parse('16.2520, -92.1350'))
        ->toBe(['latitude' => 16.2520, 'longitude' => -92.1350]);
});

test('google maps url parser reads coordinates from full maps url', function () {
    $coords = GoogleMapsUrlParser::parse('https://www.google.com/maps?q=16.2520,-92.1350');

    expect($coords)->toBe(['latitude' => 16.2520, 'longitude' => -92.1350]);
});

test('google maps url parser resolves short share links', function () {
    Http::fake([
        'maps.app.goo.gl/*' => Http::response('', 302, [
            'Location' => 'https://www.google.com/maps/place/Test/@16.2520,-92.1350,17z/data=!3d16.2521!4d-92.1351',
        ]),
        'www.google.com/*' => Http::response('', 200),
    ]);

    $coords = GoogleMapsUrlParser::parse('https://maps.app.goo.gl/MpqTqd8Hd2ADujCk7');

    expect($coords)->toBe(['latitude' => 16.2521, 'longitude' => -92.1351]);
});

test('storefront resolves shared google maps links', function () {
    Http::fake([
        'maps.app.goo.gl/*' => Http::response('', 302, [
            'Location' => 'https://www.google.com/maps/place/Test/@16.2520,-92.1350,17z/data=!3d16.2520!4d-92.1350',
        ]),
        'www.google.com/*' => Http::response('', 200),
    ]);

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Maps Resolve',
        'slug' => 'maps-resolve',
        'status' => 'active',
    ]);

    $this->asCustomer()->get(route('storefront.maps.resolve', [
        'slug' => $organization->slug,
        'url' => 'https://maps.app.goo.gl/MpqTqd8Hd2ADujCk7',
    ]))
        ->assertOk()
        ->assertJson([
            'latitude' => 16.2520,
            'longitude' => -92.1350,
        ]);
});

test('storefront accepts share links even when coordinates cannot be extracted', function () {
    Http::fake([
        'maps.app.goo.gl/*' => Http::response('', 500),
    ]);

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Maps Share',
        'slug' => 'maps-share',
        'status' => 'active',
    ]);

    $this->asCustomer()->get(route('storefront.maps.resolve', [
        'slug' => $organization->slug,
        'url' => 'https://maps.app.goo.gl/QmksuekEcDxhsjfq9',
    ]))
        ->assertOk()
        ->assertJson([
            'latitude' => null,
            'longitude' => null,
            'maps_url' => 'https://maps.app.goo.gl/QmksuekEcDxhsjfq9',
        ]);
});

test('google maps url parser resolves mobile share links without coordinates in redirect url', function () {
    Http::fake([
        'maps.app.goo.gl/*' => Http::sequence()
            ->push('', 302, [
                'Location' => 'https://www.google.com/maps/place/El+Arenal/data=!4m2!3m1!1s0x858d3f4b1a2dda23:0x24a52a261c64c5df!18m1!1e1',
            ])
            ->push('<script>"mx",[[30644.47,-92.1337856,16.2430976],[0,0,0],[1024,768],13.1]</script>', 200),
        'www.google.com/*' => Http::response('<script>"mx",[[30644.47,-92.1337856,16.2430976],[0,0,0],[1024,768],13.1]</script>', 200),
    ]);

    $coords = GoogleMapsUrlParser::parse('https://maps.app.goo.gl/vMnkbZ83nMbpzusD7?g_st=ac');

    expect($coords)->toBe(['latitude' => 16.2430976, 'longitude' => -92.1337856]);
});

test('google maps url parser ignores datacenter-biased coordinates outside Mexico', function () {
    Http::fake([
        'maps.app.goo.gl/*' => Http::sequence()
            ->push('', 302, [
                'Location' => 'https://www.google.com/maps/place/El+Arenal,+Comit%C3%A1n+de+Dom%C3%ADnguez,+Chis.,+Mexico/data=!4m2!3m1!1s0x858d3f4b1a2dda23:0x24a52a261c64c5df',
            ])
            ->push('<script>"mx",[[42.474016,-71.208023,42.474016],[0,0,0],[1024,768],13.1]</script>', 200),
        'www.google.com/*' => Http::response('<script>"mx",[[42.474016,-71.208023,42.474016],[0,0,0],[1024,768],13.1]</script>', 200),
        'nominatim.openstreetmap.org/*' => Http::response([
            ['lat' => '16.2430976', 'lon' => '-92.1337856', 'display_name' => 'El Arenal, Comitán de Domínguez, Chiapas, México'],
        ]),
    ]);

    $coords = GoogleMapsUrlParser::parse('https://maps.app.goo.gl/NcUut5SKowPfppfJ8');

    expect($coords)->toBe(['latitude' => 16.2430976, 'longitude' => -92.1337856]);
});

test('google maps url parser geocodes place name when html has no usable coordinates', function () {
    Http::fake([
        'maps.app.goo.gl/*' => Http::response('', 302, [
            'Location' => 'https://www.google.com/maps/place/El+Arenal,+Comit%C3%A1n+de+Dom%C3%ADnguez,+Chis.,+Mexico/data=!4m2!3m1!1s0x858d3f4b1a2dda23:0x24a52a261c64c5df',
        ]),
        'www.google.com/*' => Http::response('<html>no coordinates here</html>', 200),
        'nominatim.openstreetmap.org/*' => Http::response([
            ['lat' => '16.2500', 'lon' => '-92.1300', 'display_name' => 'El Arenal, Comitán de Domínguez, Chiapas, México'],
        ]),
    ]);

    $coords = GoogleMapsUrlParser::parse('https://maps.app.goo.gl/vMnkbZ83nMbpzusD7?g_st=ac');

    expect($coords)->toBe(['latitude' => 16.25, 'longitude' => -92.13]);
});

test('google maps share url detection works for goo.gl links', function () {
    expect(GoogleMapsUrlParser::isShareUrl('https://maps.app.goo.gl/QmksuekEcDxhsjfq9'))->toBeTrue();
});
