<?php

use App\Models\DeliveryZone;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createDeliveryZoneUser(): array
{
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Zonas Dashboard',
        'slug' => 'zonas-dashboard-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    return [$user->fresh(), $organization];
}

test('authenticated users can view delivery zones index', function () {
    [$user, $organization] = createDeliveryZoneUser();

    DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Zona Centro',
        'fee' => 35,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 3,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard.delivery-zones.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/DeliveryZones/Index')
            ->has('zones', 1)
            ->where('zones.0.name', 'Zona Centro')
        );
});

test('authenticated users can create delivery zones', function () {
    [$user, $organization] = createDeliveryZoneUser();

    $this->actingAs($user)
        ->post(route('dashboard.delivery-zones.store'), [
            'name' => 'Zona Norte',
            'fee' => 45,
            'center_lat' => 16.3000,
            'center_lng' => -92.1000,
            'radius_km' => 2.5,
            'is_active' => true,
        ])
        ->assertRedirect(route('dashboard.delivery-zones.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas('delivery_zones', [
        'organization_id' => $organization->id,
        'name' => 'Zona Norte',
        'fee' => '45.00',
        'radius_km' => '2.50',
    ]);
});

test('authenticated users can update delivery zones', function () {
    [$user, $organization] = createDeliveryZoneUser();

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

    $this->actingAs($user)
        ->put(route('dashboard.delivery-zones.update', $zone), [
            'name' => 'Zona Centro Actualizada',
            'fee' => 40,
            'center_lat' => 16.2520,
            'center_lng' => -92.1350,
            'radius_km' => 4,
            'is_active' => false,
        ])
        ->assertRedirect(route('dashboard.delivery-zones.index'))
        ->assertSessionHas('success');

    expect($zone->fresh())
        ->name->toBe('Zona Centro Actualizada')
        ->fee->toBe('40.00')
        ->is_active->toBeFalse();
});

test('authenticated users can delete delivery zones', function () {
    [$user, $organization] = createDeliveryZoneUser();

    $zone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Zona Sur',
        'fee' => 30,
        'center_lat' => 16.2000,
        'center_lng' => -92.1500,
        'radius_km' => 2,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->actingAs($user)
        ->delete(route('dashboard.delivery-zones.destroy', $zone))
        ->assertRedirect(route('dashboard.delivery-zones.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('delivery_zones', ['id' => $zone->id]);
});

test('users cannot manage delivery zones from another organization', function () {
    [$user] = createDeliveryZoneUser();
    [, $otherOrganization] = createDeliveryZoneUser();

    $zone = DeliveryZone::create([
        'organization_id' => $otherOrganization->id,
        'name' => 'Ajena',
        'fee' => 30,
        'center_lat' => 16.2000,
        'center_lng' => -92.1500,
        'radius_km' => 2,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->actingAs($user)
        ->put(route('dashboard.delivery-zones.update', $zone), [
            'name' => 'Hack',
            'fee' => 0,
            'center_lat' => 16.2000,
            'center_lng' => -92.1500,
            'radius_km' => 2,
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->delete(route('dashboard.delivery-zones.destroy', $zone))
        ->assertForbidden();
});

test('delivery zone store validates required fields', function () {
    [$user] = createDeliveryZoneUser();

    $this->actingAs($user)
        ->post(route('dashboard.delivery-zones.store'), [])
        ->assertSessionHasErrors(['name', 'fee', 'center_lat', 'center_lng', 'radius_km']);
});

test('guests are redirected from delivery zones', function () {
    $this->get(route('dashboard.delivery-zones.index'))->assertRedirect(route('login'));
});
