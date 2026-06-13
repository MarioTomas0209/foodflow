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
            ->push('<link href="/maps/preview/place?pb=%212d-92.1337856%213d16.2430976" />', 200),
        'www.google.com/*' => Http::response('<link href="/maps/preview/place?pb=%212d-92.1337856%213d16.2430976" />', 200),
    ]);

    $coords = GoogleMapsUrlParser::parse('https://maps.app.goo.gl/vMnkbZ83nMbpzusD7?g_st=ac');

    expect($coords)->toBe(['latitude' => 16.2430976, 'longitude' => -92.1337856]);
});

test('google maps share url detection works for goo.gl links', function () {
    expect(GoogleMapsUrlParser::isShareUrl('https://maps.app.goo.gl/QmksuekEcDxhsjfq9'))->toBeTrue();
});
