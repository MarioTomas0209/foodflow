<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createDashboardUser(): array
{
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Pedidos Org',
        'slug' => 'pedidos-org-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    return [$user->fresh(), $organization];
}

function createOrderForOrganization(Organization $organization, array $overrides = []): Order
{
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
        'price' => 30,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $order = Order::create(array_merge([
        'organization_id' => $organization->id,
        'customer_name' => 'Cliente Test',
        'customer_phone' => '5512345678',
        'customer_notes' => null,
        'type' => 'pickup',
        'delivery_address' => null,
        'delivery_city' => null,
        'latitude' => null,
        'longitude' => null,
        'status' => 'pending',
        'payment_method' => 'cash',
        'subtotal' => 60,
        'delivery_fee' => 0,
        'total' => 60,
    ], $overrides));

    $order->items()->create([
        'product_id' => $product->id,
        'product_variant_id' => null,
        'product_name' => $product->name,
        'variant_name' => null,
        'unit_price' => 30,
        'quantity' => 2,
        'subtotal' => 60,
    ]);

    return $order->fresh(['items']);
}

test('orders index includes resolved product images on items', function () {
    [$user, $organization] = createDashboardUser();

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Platillos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Taco al pastor',
        'price' => 30,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
        'image' => 'products/'.$organization->id.'/taco.jpg',
    ]);

    $order = createOrderForOrganization($organization);
    $order->items()->update(['product_id' => $product->id, 'product_name' => $product->name]);

    $expectedUrl = $product->imagePublicUrl();

    $this->actingAs($user)
        ->get(route('dashboard.orders.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('orders.data.0.items.0.product_image', $expectedUrl)
        );
});

test('authenticated users can view todays orders index', function () {
    [$user, $organization] = createDashboardUser();
    createOrderForOrganization($organization);

    $this->actingAs($user)
        ->get(route('dashboard.orders.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Orders/Index')
            ->has('orders.data', 1)
            ->has('orders.data.0.items', 1)
            ->where('filters.status', 'all')
            ->where('filters.type', 'all')
            ->where('filters.date', today()->toDateString())
            ->where('filters.search', '')
        );
});

test('orders index can search by short order number', function () {
    [$user, $organization] = createDashboardUser();

    $todayOrder = createOrderForOrganization($organization, ['customer_name' => 'Hoy']);
    $yesterdayOrder = createOrderForOrganization($organization, ['customer_name' => 'Ayer']);
    $yesterdayOrder->forceFill(['created_at' => now()->subDay()])->save();

    $searchTerm = strtoupper(substr($yesterdayOrder->id, -4));

    $this->actingAs($user)
        ->get(route('dashboard.orders.index', ['search' => $searchTerm]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('orders.data', 1)
            ->where('orders.data.0.id', $yesterdayOrder->id)
            ->where('filters.search', $searchTerm)
        );
});

test('orders index can search with hash prefix', function () {
    [$user, $organization] = createDashboardUser();

    $order = createOrderForOrganization($organization, ['customer_name' => 'Buscar este']);

    $searchTerm = '#'.strtoupper(substr($order->id, -4));

    $this->actingAs($user)
        ->get(route('dashboard.orders.index', ['search' => $searchTerm]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('orders.data', 1)
            ->where('orders.data.0.customer_name', 'Buscar este')
            ->where('filters.search', ltrim($searchTerm, '#'))
        );
});

test('orders index only shows todays orders', function () {
    [$user, $organization] = createDashboardUser();

    $todayOrder = createOrderForOrganization($organization, ['customer_name' => 'Hoy']);
    $yesterdayOrder = createOrderForOrganization($organization, ['customer_name' => 'Ayer']);
    $yesterdayOrder->forceFill(['created_at' => now()->subDay()])->save();

    $this->actingAs($user)
        ->get(route('dashboard.orders.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('orders.data', 1)
            ->where('orders.data.0.customer_name', 'Hoy')
        );
});

test('orders index can filter by date', function () {
    [$user, $organization] = createDashboardUser();

    $todayOrder = createOrderForOrganization($organization, ['customer_name' => 'Hoy']);
    $yesterdayOrder = createOrderForOrganization($organization, ['customer_name' => 'Ayer']);
    $yesterdayOrder->forceFill(['created_at' => now()->subDay()])->save();

    $this->actingAs($user)
        ->get(route('dashboard.orders.index', ['date' => now()->subDay()->toDateString()]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('orders.data', 1)
            ->where('orders.data.0.customer_name', 'Ayer')
            ->where('filters.date', now()->subDay()->toDateString())
        );
});

test('orders index rejects future dates', function () {
    [$user] = createDashboardUser();

    $this->actingAs($user)
        ->get(route('dashboard.orders.index', ['date' => now()->addDay()->toDateString()]))
        ->assertSessionHasErrors('date');
});

test('orders index can filter by status and type', function () {
    [$user, $organization] = createDashboardUser();

    createOrderForOrganization($organization, [
        'customer_name' => 'Pickup pendiente',
        'type' => 'pickup',
        'status' => 'pending',
    ]);

    createOrderForOrganization($organization, [
        'customer_name' => 'Delivery confirmado',
        'type' => 'delivery',
        'status' => 'confirmed',
        'delivery_address' => 'Calle 1',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
        'latitude' => 16.2520,
        'longitude' => -92.1350,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard.orders.index', ['status' => 'confirmed', 'type' => 'delivery']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('orders.data', 1)
            ->where('orders.data.0.customer_name', 'Delivery confirmado')
            ->where('filters.status', 'confirmed')
            ->where('filters.type', 'delivery')
        );
});

test('authenticated users can view an order from their organization', function () {
    [$user, $organization] = createDashboardUser();
    $order = createOrderForOrganization($organization);

    $this->actingAs($user)
        ->get(route('dashboard.orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Orders/Show')
            ->where('order.id', $order->id)
            ->has('order.items', 1)
        );
});

test('users cannot view orders from another organization', function () {
    [$user, $organization] = createDashboardUser();
    [, $otherOrganization] = createDashboardUser();
    $order = createOrderForOrganization($otherOrganization);

    $this->actingAs($user)
        ->get(route('dashboard.orders.show', $order))
        ->assertForbidden();
});

test('authenticated users can update order status', function () {
    [$user, $organization] = createDashboardUser();
    $order = createOrderForOrganization($organization, ['status' => 'pending']);

    $this->actingAs($user)
        ->from(route('dashboard.orders.show', $order))
        ->patch(route('dashboard.orders.update-status', $order), [
            'status' => 'preparing',
        ])
        ->assertRedirect(route('dashboard.orders.show', $order))
        ->assertSessionHas('success');

    expect($order->fresh()->status)->toBe('preparing');
});

test('delivery orders can be marked as en route', function () {
    [$user, $organization] = createDashboardUser();
    $order = createOrderForOrganization($organization, [
        'status' => 'ready',
        'type' => 'delivery',
        'delivery_address' => 'Calle 1',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
    ]);

    $this->actingAs($user)
        ->patch(route('dashboard.orders.update-status', $order), [
            'status' => 'en_route',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($order->fresh()->status)->toBe('en_route');
});

test('pickup orders can be marked as en route', function () {
    [$user, $organization] = createDashboardUser();
    $order = createOrderForOrganization($organization, [
        'status' => 'ready',
        'type' => 'pickup',
    ]);

    $this->actingAs($user)
        ->patch(route('dashboard.orders.update-status', $order), [
            'status' => 'en_route',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($order->fresh()->status)->toBe('en_route');
});

test('users cannot update orders from another organization', function () {
    [$user] = createDashboardUser();
    [, $otherOrganization] = createDashboardUser();
    $order = createOrderForOrganization($otherOrganization);

    $this->actingAs($user)
        ->patch(route('dashboard.orders.update-status', $order), [
            'status' => 'confirmed',
        ])
        ->assertForbidden();
});

test('order status update rejects invalid status', function () {
    [$user, $organization] = createDashboardUser();
    $order = createOrderForOrganization($organization);

    $this->actingAs($user)
        ->patch(route('dashboard.orders.update-status', $order), [
            'status' => 'invalid-status',
        ])
        ->assertSessionHasErrors('status');
});

test('guests are redirected from dashboard orders', function () {
    $this->get(route('dashboard.orders.index'))->assertRedirect(route('login'));
});
