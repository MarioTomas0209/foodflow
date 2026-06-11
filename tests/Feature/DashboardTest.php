<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

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

test('dashboard shows real stats for todays orders', function () {
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Stats Org',
        'slug' => 'stats-org-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Platillos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Taco',
        'price' => 50,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    Order::create([
        'organization_id' => $organization->id,
        'customer_name' => 'Pendiente',
        'customer_phone' => '5511111111',
        'type' => 'pickup',
        'status' => 'pending',
        'payment_method' => 'cash',
        'subtotal' => 50,
        'delivery_fee' => 0,
        'total' => 50,
    ])->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'unit_price' => 50,
        'quantity' => 1,
        'subtotal' => 50,
    ]);

    Order::create([
        'organization_id' => $organization->id,
        'customer_name' => 'Confirmado',
        'customer_phone' => '5522222222',
        'type' => 'pickup',
        'status' => 'confirmed',
        'payment_method' => 'cash',
        'subtotal' => 100,
        'delivery_fee' => 0,
        'total' => 100,
    ])->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'unit_price' => 100,
        'quantity' => 1,
        'subtotal' => 100,
    ]);

    $yesterdayOrder = Order::create([
        'organization_id' => $organization->id,
        'customer_name' => 'Ayer',
        'customer_phone' => '5533333333',
        'type' => 'pickup',
        'status' => 'delivered',
        'payment_method' => 'cash',
        'subtotal' => 200,
        'delivery_fee' => 0,
        'total' => 200,
    ]);

    $yesterdayOrder->forceFill(['created_at' => now()->subDay()])->save();

    $this->actingAs($user->fresh())
        ->get(route('dashboard.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.orders_today', 2)
            ->where('stats.orders_pending', 1)
            ->where('stats.revenue_today', 100)
        );
});
