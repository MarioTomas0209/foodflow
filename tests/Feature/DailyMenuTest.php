<?php

use App\Models\DailyMenu;
use App\Models\DailyMenuItem;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createDailyMenuUser(): array
{
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Menú diario',
        'slug' => 'menu-diario-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    return [$user->fresh(), $organization];
}

test('owners can create a daily menu with items', function () {
    Storage::fake('public');

    [$user, $organization] = createDailyMenuUser();

    $this->actingAs($user)
        ->post(route('dashboard.daily-menus.store'), [
            'date' => '2026-06-15',
            'name' => 'Comida corrida',
            'available_from' => '13:00',
            'available_until' => '17:00',
            'is_active' => true,
            'items' => [
                [
                    'name' => 'Sopa de pasta',
                    'description' => 'Con verdura',
                    'price' => '65',
                    'stock' => '20',
                    'sort_order' => 0,
                    'image' => UploadedFile::fake()->image('sopa.jpg'),
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.daily-menus.index'))
        ->assertSessionHas('success');

    $menu = DailyMenu::query()->where('organization_id', $organization->id)->firstOrFail();

    expect($menu->name)->toBe('Comida corrida')
        ->and($menu->date->format('Y-m-d'))->toBe('2026-06-15')
        ->and($menu->items)->toHaveCount(1)
        ->and($menu->items->first()->name)->toBe('Sopa de pasta');

    Storage::disk('public')->assertExists($menu->items->first()->image);
});

test('daily menu date must be unique per organization', function () {
    [$user, $organization] = createDailyMenuUser();

    DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-15',
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->post(route('dashboard.daily-menus.store'), [
            'date' => '2026-06-15',
            'items' => [
                ['name' => 'Otro platillo', 'price' => '50'],
            ],
        ])
        ->assertSessionHasErrors('date');
});

test('organization todayMenu returns active menu for today', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-15 10:00:00'));

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Hoy',
        'slug' => 'hoy-menu',
        'status' => 'active',
    ]);

    DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-14',
        'is_active' => true,
    ]);

    $todayMenu = DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-15',
        'name' => 'Menú de hoy',
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'is_active' => true,
    ]);

    DailyMenuItem::create([
        'daily_menu_id' => $todayMenu->id,
        'name' => 'Enchiladas',
        'price' => 70,
        'sort_order' => 0,
    ]);

    DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-16',
        'name' => 'Inactivo',
        'is_active' => false,
    ]);

    $menu = $organization->todayMenu();

    expect($menu)->not->toBeNull()
        ->and($menu->id)->toBe($todayMenu->id)
        ->and($menu->items)->toHaveCount(1)
        ->and($menu->isAvailableNow())->toBeFalse()
        ->and($menu->canOrderNow())->toBeTrue();

    Carbon::setTestNow();
});

test('daily menu orders are accepted before opening hours', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-15 10:00:00'));

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Menú anticipado',
        'slug' => 'menu-anticipado',
        'status' => 'active',
    ]);

    $menu = DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-15',
        'available_from' => '14:00:00',
        'available_until' => '19:00:00',
        'is_active' => true,
    ]);

    $dailyItem = DailyMenuItem::create([
        'daily_menu_id' => $menu->id,
        'name' => 'Guacamole',
        'price' => 45,
        'stock' => 5,
        'has_variants' => false,
        'sort_order' => 0,
    ]);

    $this->asCustomer()->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Ana',
        'customer_phone' => '5512345678',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'items' => [
            [
                'source' => 'daily',
                'product_id' => $dailyItem->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertRedirect();

    Carbon::setTestNow();
});

test('daily menu orders are rejected outside configured hours', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-15 18:30:00'));

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Menú fuera de horario',
        'slug' => 'menu-fuera-horario',
        'status' => 'active',
    ]);

    $menu = DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-15',
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'is_active' => true,
    ]);

    $dailyItem = DailyMenuItem::create([
        'daily_menu_id' => $menu->id,
        'name' => 'Sopa del día',
        'price' => 55,
        'stock' => 5,
        'has_variants' => false,
        'sort_order' => 0,
    ]);

    $this->asCustomer()->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Carla',
        'customer_phone' => '5512349999',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'items' => [
            [
                'source' => 'daily',
                'product_id' => $dailyItem->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertSessionHasErrors('items');

    expect(\App\Models\Order::query()->count())->toBe(0);

    Carbon::setTestNow();
});

test('storefront exposes today daily menu with public item images', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-15 14:00:00'));
    Storage::fake('public');

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Storefront menú',
        'slug' => 'storefront-menu-diario',
        'status' => 'active',
    ]);

    $menu = DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-15',
        'name' => 'Comida corrida',
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'is_active' => true,
    ]);

    $path = UploadedFile::fake()->image('guisado.jpg')->store('daily-menus/'.$organization->id, 'public');

    DailyMenuItem::create([
        'daily_menu_id' => $menu->id,
        'name' => 'Guisado del día',
        'price' => 75,
        'stock' => 10,
        'image' => $path,
        'sort_order' => 0,
    ]);

    $expectedUrl = Storage::disk('public')->url($path);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('daily_menu.name', 'Comida corrida')
            ->where('daily_menu.is_available_now', true)
            ->where('daily_menu.can_order_now', true)
            ->has('daily_menu.items', 1)
            ->where('daily_menu.items.0.name', 'Guisado del día')
            ->where('daily_menu.items.0.image', $expectedUrl)
            ->where('daily_menu.items.0.is_available', true)
        );

    Carbon::setTestNow();
});

test('owners can create a daily menu item with variants', function () {
    [$user, $organization] = createDailyMenuUser();

    $this->actingAs($user)
        ->post(route('dashboard.daily-menus.store'), [
            'date' => '2026-06-16',
            'name' => 'Comida corrida',
            'is_active' => true,
            'items' => [
                [
                    'name' => 'Milanesa',
                    'description' => 'Con papas',
                    'has_variants' => true,
                    'variants' => [
                        ['name' => 'Orden', 'price' => '150', 'stock' => '10'],
                        ['name' => 'Media', 'price' => '75', 'stock' => '5'],
                    ],
                    'sort_order' => 0,
                ],
            ],
        ])
        ->assertRedirect(route('dashboard.daily-menus.index'))
        ->assertSessionHas('success');

    $item = DailyMenuItem::query()->where('name', 'Milanesa')->firstOrFail();

    expect($item->has_variants)->toBeTrue()
        ->and($item->variants)->toHaveCount(2)
        ->and($item->variants->pluck('name')->all())->toBe(['Orden', 'Media']);
});

test('storefront exposes daily menu item variants', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-15 14:00:00'));

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Variantes menú',
        'slug' => 'variantes-menu-diario',
        'status' => 'active',
    ]);

    $menu = DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-15',
        'is_active' => true,
    ]);

    $item = DailyMenuItem::create([
        'daily_menu_id' => $menu->id,
        'name' => 'Milanesa',
        'has_variants' => true,
        'price' => 0,
        'sort_order' => 0,
    ]);

    $item->variants()->createMany([
        ['name' => 'Orden', 'price' => 150, 'stock' => 10, 'sort_order' => 0],
        ['name' => 'Media', 'price' => 75, 'stock' => 5, 'sort_order' => 1],
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('daily_menu.items.0.has_variants', true)
            ->has('daily_menu.items.0.variants', 2)
            ->where('daily_menu.items.0.variants.0.name', 'Orden')
            ->where('daily_menu.items.0.variants.1.name', 'Media')
        );

    Carbon::setTestNow();
});

test('storefront daily menu is null when there is no active menu today', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Sin menú hoy',
        'slug' => 'sin-menu-hoy',
        'status' => 'active',
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('daily_menu', null));
});

test('owners can delete daily menus from their organization', function () {
    [$user, $organization] = createDailyMenuUser();

    $menu = DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => '2026-06-20',
        'is_active' => true,
    ]);

    $this->actingAs($user)
        ->delete(route('dashboard.daily-menus.destroy', $menu))
        ->assertRedirect(route('dashboard.daily-menus.index'));

    $this->assertDatabaseMissing('daily_menus', ['id' => $menu->id]);
});
