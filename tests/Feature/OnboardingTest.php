<?php

use App\Models\Organization;
use App\Models\User;

test('guests are redirected to login when visiting onboarding', function () {
    $this->get(route('onboarding'))->assertRedirect(route('login'));
});

test('guests cannot submit onboarding', function () {
    $this->post(route('onboarding.store'), [
        'name' => 'Taquería El Patrón',
        'slug' => 'taqueria-el-patron',
    ])->assertRedirect(route('login'));
});

test('authenticated users can visit the onboarding page', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('onboarding'))
        ->assertOk();
});

test('authenticated users can create an organization', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('onboarding.store'), [
        'name' => 'Taquería El Patrón',
        'slug' => 'taqueria-el-patron',
        'phone' => '+52 55 1234 5678',
        'description' => 'La mejor taquería del barrio',
    ]);

    $response->assertRedirect(route('dashboard.index'));

    $this->assertDatabaseHas('organizations', [
        'owner_id' => $user->id,
        'name' => 'Taquería El Patrón',
        'slug' => 'taqueria-el-patron',
        'phone' => '+52 55 1234 5678',
        'description' => 'La mejor taquería del barrio',
        'status' => 'active',
    ]);

    $organization = Organization::query()->where('slug', 'taqueria-el-patron')->first();

    expect($organization)->not->toBeNull();

    $this->assertDatabaseHas('organization_user', [
        'organization_id' => $organization->id,
        'user_id' => $user->id,
        'role' => 'owner',
    ]);

    expect($user->fresh()->current_organization_id)->toBe($organization->id);
});

test('onboarding generates slug from name when slug is empty', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('onboarding.store'), [
        'name' => 'Taquería El Patrón',
        'slug' => '',
    ])->assertRedirect(route('dashboard.index'));

    $this->assertDatabaseHas('organizations', [
        'owner_id' => $user->id,
        'name' => 'Taquería El Patrón',
        'slug' => 'taqueria-el-patron',
    ]);
});

test('onboarding requires name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('onboarding'))
        ->post(route('onboarding.store'), [
            'name' => '',
            'slug' => 'mi-negocio',
        ])
        ->assertRedirect(route('onboarding'))
        ->assertSessionHasErrors('name');

    $this->assertDatabaseCount('organizations', 0);
});

test('onboarding requires unique slug', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Organization::create([
        'owner_id' => $otherUser->id,
        'name' => 'Existing Org',
        'slug' => 'taqueria-el-patron',
        'status' => 'active',
    ]);

    $this->actingAs($user)
        ->from(route('onboarding'))
        ->post(route('onboarding.store'), [
            'name' => 'Taquería El Patrón',
            'slug' => 'taqueria-el-patron',
        ])
        ->assertRedirect(route('onboarding'))
        ->assertSessionHasErrors('slug');

    $this->assertDatabaseCount('organizations', 1);
});

test('onboarding rejects invalid slug format', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('onboarding'))
        ->post(route('onboarding.store'), [
            'name' => 'Mi Negocio',
            'slug' => 'Mi_Negocio!',
        ])
        ->assertRedirect(route('onboarding'))
        ->assertSessionHasErrors('slug');

    $this->assertDatabaseCount('organizations', 0);
});
