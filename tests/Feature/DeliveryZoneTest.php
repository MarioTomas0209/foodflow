<?php

use App\Models\DeliveryZone;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Str;

test('delivery zone contains coordinates within radius', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Zonas Org',
        'slug' => 'zonas-org-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $zone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Zona Centro',
        'fee' => 35,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 3,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    expect($zone->containsCoordinates(16.2520, -92.1350))->toBeTrue()
        ->and($zone->containsCoordinates(16.2600, -92.1350))->toBeTrue()
        ->and($zone->containsCoordinates(16.4000, -92.1350))->toBeFalse();
});

test('organization finds active delivery zone for coordinates', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Cobertura Org',
        'slug' => 'cobertura-org-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Zona Norte',
        'fee' => 50,
        'center_lat' => 16.3000,
        'center_lng' => -92.1000,
        'radius_km' => 2,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $centro = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Zona Centro',
        'fee' => 35,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 3,
        'is_active' => true,
        'sort_order' => 1,
    ]);

    DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Zona Inactiva',
        'fee' => 20,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 10,
        'is_active' => false,
        'sort_order' => 2,
    ]);

    expect($organization->findDeliveryZoneFor(16.2520, -92.1350)?->id)->toBe($centro->id)
        ->and($organization->findDeliveryZoneFor(16.5000, -92.5000))->toBeNull();
});

test('orders can belong to a delivery zone', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Pedido Zona',
        'slug' => 'pedido-zona-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $zone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Zona Centro',
        'fee' => 35,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 3,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $order = $organization->orders()->create([
        'customer_name' => 'Cliente',
        'customer_phone' => '5512345678',
        'type' => 'delivery',
        'delivery_address' => 'Calle 1',
        'delivery_city' => 'Comitán',
        'latitude' => 16.2520,
        'longitude' => -92.1350,
        'delivery_zone_id' => $zone->id,
        'status' => 'pending',
        'payment_method' => 'cash',
        'subtotal' => 100,
        'delivery_fee' => 35,
        'total' => 135,
    ]);

    expect($order->fresh()->deliveryZone?->id)->toBe($zone->id);
});
