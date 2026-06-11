<?php

use App\Events\NewOrderReceived;
use App\Models\Category;
use App\Models\Order;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can view checkout page for active organization', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Checkout',
        'slug' => 'taqueria-checkout',
        'status' => 'active',
    ]);

    $this->get(route('storefront.checkout', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Checkout')
            ->where('organization.slug', 'taqueria-checkout')
        );
});

test('guests can place an order with server side pricing', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Pedidos',
        'slug' => 'taqueria-pedidos',
        'phone' => '+52 55 1234 5678',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Tacos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Taco al pastor',
        'price' => 25,
        'stock' => 10,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $response = $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Juan Pérez',
        'customer_phone' => '5512345678',
        'customer_notes' => 'Sin cebolla',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 2,
            ],
        ],
    ]);

    $order = Order::query()->first();

    expect($order)->not->toBeNull();

    $response->assertRedirect(route('storefront.order.confirmation', $order));

    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'organization_id' => $organization->id,
        'customer_name' => 'Juan Pérez',
        'customer_phone' => '5512345678',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'subtotal' => '50.00',
        'total' => '50.00',
        'status' => 'pending',
    ]);

    $this->assertDatabaseHas('order_items', [
        'order_id' => $order->id,
        'product_id' => $product->id,
        'product_name' => 'Taco al pastor',
        'unit_price' => '25.00',
        'quantity' => 2,
        'subtotal' => '50.00',
    ]);

    expect($product->fresh()->stock)->toBe(8);
});

test('guests see order confirmation page after placing order', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Confirmación',
        'slug' => 'confirmacion',
        'phone' => '+52 55 9999 8888',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Bebidas',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Agua',
        'price' => 15,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Ana',
        'customer_phone' => '5599998888',
        'type' => 'delivery',
        'delivery_address' => 'Calle 1',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
        'latitude' => 16.2520,
        'longitude' => -92.1350,
        'payment_method' => 'transfer',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ]);

    $order = Order::query()->firstOrFail();

    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'latitude' => '16.2520000',
        'longitude' => '-92.1350000',
    ]);

    $this->get(route('storefront.order.confirmation', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/OrderConfirmation')
            ->where('order.customer_name', 'Ana')
            ->where('order.total', '15.00')
            ->has('order.items', 1)
            ->where('organization.phone', '+52 55 9999 8888')
        );
});

test('order store rejects insufficient stock', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Sin stock',
        'slug' => 'sin-stock',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Platillos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Último taco',
        'price' => 30,
        'stock' => 1,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Pedro',
        'customer_phone' => '5511112222',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 3,
            ],
        ],
    ])->assertSessionHasErrors('items.0.quantity');
});

test('delivery orders require coordinates', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Sin ubicación',
        'slug' => 'sin-ubicacion',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Platillos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Quesadilla',
        'price' => 40,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Luis',
        'customer_phone' => '5511223344',
        'type' => 'delivery',
        'delivery_address' => 'Av. Central 123',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertSessionHasErrors(['latitude', 'longitude']);
});

test('placing an order broadcasts NewOrderReceived on the organization channel', function () {
    Event::fake([NewOrderReceived::class]);

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Broadcast Org',
        'slug' => 'broadcast-org',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Platillos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Burrito',
        'price' => 45,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Cliente Broadcast',
        'customer_phone' => '5512345678',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertRedirect();

    Event::assertDispatched(NewOrderReceived::class, function (NewOrderReceived $event) use ($organization) {
        return $event->order->organization_id === $organization->id
            && $event->order->relationLoaded('items')
            && $event->order->items->count() === 1;
    });
});
