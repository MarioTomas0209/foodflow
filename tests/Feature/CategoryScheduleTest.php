<?php

use App\Models\Category;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('category without schedule is always available', function () {
    $user = User::factory()->create();

    $category = Category::create([
        'organization_id' => Organization::create([
            'owner_id' => $user->id,
            'name' => 'Sin horario',
            'slug' => 'sin-horario',
            'status' => 'active',
        ])->id,
        'name' => 'General',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    expect($category->isAvailableNow())->toBeTrue();
});

test('category is unavailable outside configured hours', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-09 12:00:00')); // lunes

    $user = User::factory()->create();

    $category = Category::create([
        'organization_id' => Organization::create([
            'owner_id' => $user->id,
            'name' => 'Desayunos',
            'slug' => 'desayunos',
            'status' => 'active',
        ])->id,
        'name' => 'Desayunos',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '08:00:00',
        'available_until' => '11:00:00',
        'available_days' => [1, 2, 3, 4, 5],
    ]);

    expect($category->isAvailableNow())->toBeFalse();

    Carbon::setTestNow();
});

test('category is available during configured hours and days', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-09 09:30:00')); // lunes

    $user = User::factory()->create();

    $category = Category::create([
        'organization_id' => Organization::create([
            'owner_id' => $user->id,
            'name' => 'Desayunos',
            'slug' => 'desayunos-abierto',
            'status' => 'active',
        ])->id,
        'name' => 'Desayunos',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '08:00:00',
        'available_until' => '11:00:00',
        'available_days' => [1, 2, 3, 4, 5],
    ]);

    expect($category->isAvailableNow())->toBeTrue();

    Carbon::setTestNow();
});

test('category is unavailable on unconfigured weekdays', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-14 09:30:00')); // domingo

    $user = User::factory()->create();

    $category = Category::create([
        'organization_id' => Organization::create([
            'owner_id' => $user->id,
            'name' => 'Comidas',
            'slug' => 'comidas',
            'status' => 'active',
        ])->id,
        'name' => 'Comidas',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'available_days' => [1, 2, 3, 4, 5],
    ]);

    expect($category->isAvailableNow())->toBeFalse();

    Carbon::setTestNow();
});

test('owners can create categories with restricted schedule', function () {
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Menú horarios',
        'slug' => 'menu-horarios-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    $this->actingAs($user)
        ->post(route('dashboard.menu.categories.store'), [
            'name' => 'Desayunos',
            'description' => 'Solo por la mañana',
            'available_from' => '08:00',
            'available_until' => '11:00',
            'available_days' => [1, 2, 3, 4, 5],
        ])
        ->assertRedirect(route('dashboard.menu.index'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas('categories', [
        'organization_id' => $organization->id,
        'name' => 'Desayunos',
        'available_from' => '08:00:00',
        'available_until' => '11:00:00',
    ]);

    $category = Category::query()->where('organization_id', $organization->id)->firstOrFail();

    expect($category->available_days)->toBe([1, 2, 3, 4, 5]);
});

test('owners can update categories with restricted schedule', function () {
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Menú editar',
        'slug' => 'menu-editar-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Desayunos',
        'description' => 'Original',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->actingAs($user)
        ->put(route('dashboard.menu.categories.update', $category), [
            'name' => 'Comidas',
            'description' => 'Solo tardes',
            'is_active' => false,
            'available_from' => '13:00',
            'available_until' => '17:00',
            'available_days' => [1, 2, 3, 4, 5],
        ])
        ->assertRedirect(route('dashboard.menu.index'))
        ->assertSessionHas('success');

    $category->refresh();

    expect($category->name)->toBe('Comidas')
        ->and($category->description)->toBe('Solo tardes')
        ->and($category->is_active)->toBeFalse()
        ->and($category->available_from)->toBe('13:00:00')
        ->and($category->available_until)->toBe('17:00:00')
        ->and($category->available_days)->toBe([1, 2, 3, 4, 5]);
});

test('informative schedule allows orders outside configured hours', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-09 12:00:00')); // lunes, fuera de desayuno

    $user = User::factory()->create();

    $category = Category::create([
        'organization_id' => Organization::create([
            'owner_id' => $user->id,
            'name' => 'Pedido anticipado',
            'slug' => 'pedido-anticipado',
            'status' => 'active',
        ])->id,
        'name' => 'Comidas',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'available_days' => [1, 2, 3, 4, 5],
        'schedule_type' => 'informative',
    ]);

    expect($category->isAvailableNow())->toBeFalse()
        ->and($category->canOrderNow())->toBeTrue();

    Carbon::setTestNow();
});

test('restricted schedule blocks orders outside configured hours', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-09 12:00:00')); // lunes, fuera de desayuno

    $user = User::factory()->create();

    $category = Category::create([
        'organization_id' => Organization::create([
            'owner_id' => $user->id,
            'name' => 'Horario estricto',
            'slug' => 'horario-estricto',
            'status' => 'active',
        ])->id,
        'name' => 'Desayunos',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '08:00:00',
        'available_until' => '11:00:00',
        'available_days' => [1, 2, 3, 4, 5],
        'schedule_type' => 'restricted',
    ]);

    expect($category->isAvailableNow())->toBeFalse()
        ->and($category->canOrderNow())->toBeFalse();

    Carbon::setTestNow();
});

test('owners cannot update categories from another organization', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Org A',
        'slug' => 'org-a-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $otherOrganization = Organization::create([
        'owner_id' => $otherUser->id,
        'name' => 'Org B',
        'slug' => 'org-b-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    $foreignCategory = Category::create([
        'organization_id' => $otherOrganization->id,
        'name' => 'Ajena',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->actingAs($user)
        ->put(route('dashboard.menu.categories.update', $foreignCategory), [
            'name' => 'Hack',
        ])
        ->assertForbidden();
});

test('storefront exposes category availability for restricted schedules', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-09 12:00:00')); // lunes, fuera de desayuno

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Horario categoría',
        'slug' => 'horario-categoria',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Desayunos',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '08:00:00',
        'available_until' => '11:00:00',
        'available_days' => [1, 2, 3, 4, 5],
        'schedule_type' => 'restricted',
    ]);

    Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Huevos',
        'price' => 45,
        'has_variants' => false,
        'stock' => 10,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('categories', 1)
            ->where('categories.0.schedule_type', 'restricted')
            ->where('categories.0.available_from', '08:00:00')
            ->where('categories.0.available_until', '11:00:00')
            ->where('categories.0.available_days', [1, 2, 3, 4, 5])
            ->where('categories.0.is_available_now', false)
            ->where('categories.0.can_order_now', false)
        );

    Carbon::setTestNow();
});

test('storefront allows orders for informative schedules outside hours', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-09 08:30:00')); // lunes, antes de comida

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Pedido anticipado storefront',
        'slug' => 'pedido-anticipado-storefront',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Comidas',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'available_days' => [1, 2, 3, 4, 5],
        'schedule_type' => 'informative',
    ]);

    Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Menú del día',
        'price' => 65,
        'has_variants' => false,
        'stock' => 10,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('categories', 1)
            ->where('categories.0.schedule_type', 'informative')
            ->where('categories.0.is_available_now', false)
            ->where('categories.0.can_order_now', true)
        );

    Carbon::setTestNow();
});
