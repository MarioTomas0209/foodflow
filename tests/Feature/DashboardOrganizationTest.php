<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createOrganizationSettingsUser(): array
{
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Settings',
        'slug' => 'taqueria-settings-'.Str::lower(Str::random(6)),
        'description' => 'Descripción original',
        'phone' => '5511111111',
        'email' => 'original@test.com',
        'address' => 'Calle 1',
        'city' => 'Comitán',
        'state' => 'Chiapas',
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    return [$user->fresh(), $organization];
}

test('authenticated users can view organization settings', function () {
    [$user, $organization] = createOrganizationSettingsUser();

    $this->actingAs($user)
        ->get(route('dashboard.settings'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Organization/Edit')
            ->where('organization.id', $organization->id)
            ->where('organization.name', 'Taquería Settings')
            ->where('organization.email', 'original@test.com')
        );
});

test('authenticated users can update organization profile', function () {
    [$user, $organization] = createOrganizationSettingsUser();

    $this->actingAs($user)
        ->post(route('dashboard.settings.update'), [
            'name' => 'Taquería Nueva',
            'description' => 'Nueva descripción',
            'phone' => '5599998888',
            'email' => 'nuevo@test.com',
            'address' => 'Av. Central 100',
            'city' => 'Comitán de Domínguez',
            'state' => 'Chiapas',
        ])
        ->assertRedirect(route('dashboard.settings'))
        ->assertSessionHas('success');

    $organization->refresh();

    expect($organization->name)->toBe('Taquería Nueva')
        ->and($organization->description)->toBe('Nueva descripción')
        ->and($organization->phone)->toBe('5599998888')
        ->and($organization->email)->toBe('nuevo@test.com')
        ->and($organization->address)->toBe('Av. Central 100')
        ->and($organization->city)->toBe('Comitán de Domínguez')
        ->and($organization->state)->toBe('Chiapas');
});

test('organization update stores logo and deletes previous file', function () {
    Storage::fake('public');

    [$user, $organization] = createOrganizationSettingsUser();

    $oldLogo = UploadedFile::fake()->image('old-logo.jpg');
    $oldPath = $oldLogo->store("logos/{$organization->id}", 'public');
    $organization->update(['logo' => $oldPath]);

    $newLogo = UploadedFile::fake()->image('new-logo.png');

    $this->actingAs($user)
        ->post(route('dashboard.settings.update'), [
            'name' => $organization->name,
            'logo' => $newLogo,
        ])
        ->assertRedirect(route('dashboard.settings'));

    $organization->refresh();

    expect($organization->logo)->not->toBe($oldPath)
        ->and($organization->logo)->toStartWith("logos/{$organization->id}/");

    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($organization->logo);
});

test('organization update validates logo mime type', function () {
    Storage::fake('public');

    [$user, $organization] = createOrganizationSettingsUser();

    $this->actingAs($user)
        ->post(route('dashboard.settings.update'), [
            'name' => $organization->name,
            'logo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors('logo');
});

test('guests are redirected from organization settings', function () {
    $this->get(route('dashboard.settings'))->assertRedirect(route('login'));
});
