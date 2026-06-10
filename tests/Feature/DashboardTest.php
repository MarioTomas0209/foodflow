<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Str;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard.index'))->assertRedirect(route('login'));
});

test('authenticated users without an organization are redirected to onboarding', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('dashboard.index'))
        ->assertRedirect(route('onboarding'));
});

test('authenticated users with an organization can visit the dashboard', function () {
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Test Org',
        'slug' => 'test-org-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, [
        'role' => 'owner',
    ]);

    $user->update(['current_organization_id' => $organization->id]);

    $this->actingAs($user->fresh())
        ->get(route('dashboard.index'))
        ->assertOk();
});
