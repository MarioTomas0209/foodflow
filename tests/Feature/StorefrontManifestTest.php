<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('storefront manifest returns install metadata for an active organization', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Virsa Comida',
        'slug' => 'virsa-comida',
        'description' => 'Comida casera en Comitán',
        'status' => 'active',
    ]);

    $this->get(route('storefront.manifest', $organization->slug))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/manifest+json')
        ->assertJson([
            'id' => '/virsa-comida',
            'name' => 'Virsa Comida',
            'short_name' => 'Virsa Comida',
            'start_url' => '/virsa-comida',
            'scope' => '/virsa-comida/',
            'display' => 'standalone',
            'theme_color' => '#f97316',
        ])
        ->assertJsonPath('icons.0.src', '/virsa-comida/pwa/icon-192.png')
        ->assertJsonPath('icons.2.src', '/virsa-comida/pwa/icon-maskable.png');
});

test('storefront manifest is not available for inactive organizations', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Cerrado',
        'slug' => 'cerrado-'.str()->lower(str()->random(6)),
        'status' => 'inactive',
    ]);

    $this->get(route('storefront.manifest', $organization->slug))->assertNotFound();
});

test('storefront pwa icons are generated from organization logo', function () {
    if (! extension_loaded('gd')) {
        $this->markTestSkipped('GD extension is required to generate PWA assets.');
    }

    Storage::fake('public');

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'PWA Logo',
        'slug' => 'pwa-logo',
        'status' => 'active',
    ]);

    $logo = UploadedFile::fake()->image('logo.png', 320, 320);
    $logoPath = $logo->store("logos/{$organization->id}", 'public');
    $organization->update(['logo' => $logoPath]);

    $this->get(route('storefront.pwa.icon', [$organization->slug, 192]))
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png');

    $this->get(route('storefront.pwa.icon-maskable', $organization->slug))
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png');

    Storage::disk('public')->assertExists("pwa/{$organization->id}/icon-192.png");
    Storage::disk('public')->assertExists("pwa/{$organization->id}/icon-512-maskable.png");
});

test('storefront pwa splash image is generated for ios startup', function () {
    if (! extension_loaded('gd')) {
        $this->markTestSkipped('GD extension is required to generate PWA assets.');
    }

    Storage::fake('public');

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'PWA Splash',
        'slug' => 'pwa-splash',
        'status' => 'active',
    ]);

    $logo = UploadedFile::fake()->image('logo.png', 400, 400);
    $organization->update([
        'logo' => $logo->store("logos/{$organization->id}", 'public'),
    ]);

    $this->get(route('storefront.pwa.splash', [$organization->slug, 1170, 2532]))
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png');

    Storage::disk('public')->assertExists("pwa/{$organization->id}/splash-1170x2532.png");
});

test('organization logo update clears cached pwa assets', function () {
    if (! extension_loaded('gd')) {
        $this->markTestSkipped('GD extension is required to generate PWA assets.');
    }

    Storage::fake('public');

    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Cache PWA',
        'slug' => 'cache-pwa',
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    $logo = UploadedFile::fake()->image('logo.png', 300, 300);
    $organization->update(['logo' => $logo->store("logos/{$organization->id}", 'public')]);

    $this->get(route('storefront.pwa.icon', [$organization->slug, 192]))->assertOk();
    Storage::disk('public')->assertExists("pwa/{$organization->id}/icon-192.png");

    $newLogo = UploadedFile::fake()->image('new-logo.png', 300, 300);

    $this->actingAs($user)
        ->post(route('dashboard.settings.update'), [
            'name' => 'Cache PWA',
            'logo' => $newLogo,
        ])
        ->assertRedirect(route('dashboard.settings'));

    Storage::disk('public')->assertMissing("pwa/{$organization->id}/icon-192.png");
});
