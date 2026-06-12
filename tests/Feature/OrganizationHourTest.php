<?php

use App\Models\Organization;
use App\Models\OrganizationHour;
use App\Models\User;
use Illuminate\Support\Carbon;

test('onboarding creates default organization hours', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('onboarding.store'), [
        'name' => 'Taquería Horarios',
        'slug' => 'taqueria-horarios',
    ])->assertRedirect(route('dashboard.index'));

    $organization = Organization::query()->where('slug', 'taqueria-horarios')->firstOrFail();

    expect($organization->hours)->toHaveCount(7);

    $this->assertDatabaseHas('organization_hours', [
        'organization_id' => $organization->id,
        'day_of_week' => 0,
        'is_closed' => true,
    ]);

    $this->assertDatabaseHas('organization_hours', [
        'organization_id' => $organization->id,
        'day_of_week' => 1,
        'opens_at' => '08:00:00',
        'closes_at' => '20:00:00',
        'is_closed' => false,
    ]);
});

test('organization is closed when today is marked closed', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-14 12:00:00')); // domingo

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Cerrado domingo',
        'slug' => 'cerrado-domingo',
        'status' => 'active',
    ]);

    OrganizationHour::create([
        'organization_id' => $organization->id,
        'day_of_week' => 0,
        'opens_at' => '08:00:00',
        'closes_at' => '20:00:00',
        'is_closed' => true,
    ]);

    expect($organization->isOpenNow())->toBeFalse();

    Carbon::setTestNow();
});

test('organization is open during configured hours', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-09 10:00:00')); // lunes

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Abierto lunes',
        'slug' => 'abierto-lunes',
        'status' => 'active',
    ]);

    OrganizationHour::create([
        'organization_id' => $organization->id,
        'day_of_week' => 1,
        'opens_at' => '08:00:00',
        'closes_at' => '20:00:00',
        'is_closed' => false,
    ]);

    expect($organization->isOpenNow())->toBeTrue();

    Carbon::setTestNow();
});

test('organization is open when no hours are configured for today', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-10 15:00:00')); // martes

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Sin horario hoy',
        'slug' => 'sin-horario-hoy',
        'status' => 'active',
    ]);

    OrganizationHour::create([
        'organization_id' => $organization->id,
        'day_of_week' => 1,
        'opens_at' => '08:00:00',
        'closes_at' => '20:00:00',
        'is_closed' => false,
    ]);

    expect($organization->isOpenNow())->toBeTrue();

    Carbon::setTestNow();
});
