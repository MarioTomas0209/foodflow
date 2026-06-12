<?php

use App\Events\NewOrderReceived;
use App\Models\Category;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\DailyMenuItem;
use App\Models\DeliveryZone;
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
            ->where('customer', null)
            ->has('addresses', 0)
            ->has('zones', 0)
            ->has('cart_context.categories')
            ->has('cart_context.product_categories')
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

    $zone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Centro',
        'fee' => 35,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 5,
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
        'delivery_zone_id' => $zone->id,
        'delivery_fee' => '35.00',
        'total' => '50.00',
    ]);

    $this->get(route('storefront.order.confirmation', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/OrderConfirmation')
            ->where('order.customer_name', 'Ana')
            ->where('order.total', '50.00')
            ->where('order.delivery_fee', '35.00')
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

test('delivery orders require a valid delivery zone', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Sin zona',
        'slug' => 'sin-zona',
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
    ])->assertSessionHasErrors('delivery_address');
});

test('delivery orders accept manual zone selection without coordinates', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Zona manual',
        'slug' => 'zona-manual',
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
        'name' => 'Taco',
        'price' => 25,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $zone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Centro',
        'fee' => 20,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 5,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Carlos',
        'customer_phone' => '5511445566',
        'type' => 'delivery',
        'delivery_address' => 'Calle 5',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
        'zone_id' => $zone->id,
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('orders', [
        'customer_name' => 'Carlos',
        'delivery_zone_id' => $zone->id,
        'delivery_fee' => '20.00',
        'total' => '45.00',
        'latitude' => null,
        'longitude' => null,
    ]);
});

test('delivery orders store the pasted google maps share link', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Maps URL',
        'slug' => 'maps-url',
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
        'name' => 'Taco',
        'price' => 25,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $zone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Centro',
        'fee' => 20,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 5,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $mapsUrl = 'https://maps.app.goo.gl/MpqTqd8Hd2ADujCk7';

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Rosa',
        'customer_phone' => '5511667788',
        'type' => 'delivery',
        'delivery_address' => 'Calle 8',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
        'latitude' => 16.2520,
        'longitude' => -92.1350,
        'delivery_maps_url' => $mapsUrl,
        'zone_id' => $zone->id,
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('orders', [
        'customer_name' => 'Rosa',
        'delivery_maps_url' => $mapsUrl,
        'delivery_zone_id' => $zone->id,
    ]);
});

test('delivery orders prefer coordinates over manual zone when both are provided', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Prioridad GPS',
        'slug' => 'prioridad-gps',
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
        'price' => 50,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $gpsZone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Centro',
        'fee' => 30,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 5,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $otherZone = DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Norte',
        'fee' => 50,
        'center_lat' => 16.3000,
        'center_lng' => -92.1350,
        'radius_km' => 5,
        'is_active' => true,
        'sort_order' => 1,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Elena',
        'customer_phone' => '5511556677',
        'type' => 'delivery',
        'delivery_address' => 'Calle 10',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
        'latitude' => 16.2520,
        'longitude' => -92.1350,
        'zone_id' => $otherZone->id,
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('orders', [
        'customer_name' => 'Elena',
        'delivery_zone_id' => $gpsZone->id,
        'delivery_fee' => '30.00',
    ]);
});

test('delivery orders reject addresses outside coverage zones', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Fuera de zona',
        'slug' => 'fuera-de-zona',
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
        'name' => 'Torta',
        'price' => 50,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Centro',
        'fee' => 30,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 1,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'María',
        'customer_phone' => '5511334455',
        'type' => 'delivery',
        'delivery_address' => 'Lejos del centro',
        'delivery_city' => 'Comitán de Domínguez, Chiapas',
        'latitude' => 19.4326,
        'longitude' => -99.1332,
        'payment_method' => 'cash',
        'items' => [
            [
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertSessionHasErrors('delivery_address');

    expect(Order::query()->count())->toBe(0);
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

test('authenticated customers receive saved addresses on checkout', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Checkout Cliente',
        'slug' => 'checkout-cliente',
        'status' => 'active',
    ]);

    $customer = Customer::create([
        'name' => 'Ana Cliente',
        'phone' => '9631112233',
        'password' => 'secreta123',
    ]);

    CustomerAddress::create([
        'customer_id' => $customer->id,
        'label' => 'Casa',
        'address' => '2da avenida poniente sur #54',
        'city' => 'Comitán de Domínguez, Chiapas',
        'is_default' => true,
    ]);

    $this->actingAs($customer, 'customer')
        ->get(route('storefront.checkout', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Checkout')
            ->where('customer.phone', '9631112233')
            ->has('addresses', 1)
            ->where('addresses.0.label', 'Casa')
        );
});

test('authenticated customers get customer_id on orders and can save new addresses', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Pedido Cliente',
        'slug' => 'pedido-cliente',
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
        'name' => 'Taco',
        'price' => 25,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Centro',
        'fee' => 30,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 5,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $customer = Customer::create([
        'name' => 'Luis Cliente',
        'phone' => '9634445566',
        'password' => 'secreta123',
    ]);

    $this->actingAs($customer, 'customer')
        ->post(route('storefront.orders.store', $organization->slug), [
            'organization_id' => $organization->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'type' => 'delivery',
            'delivery_address' => 'Calle nueva 10',
            'delivery_city' => 'Comitán de Domínguez, Chiapas',
            'latitude' => 16.2520,
            'longitude' => -92.1350,
            'save_address' => true,
            'address_label' => 'Trabajo',
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => null,
                    'quantity' => 1,
                ],
            ],
        ])
        ->assertRedirect();

    $order = Order::query()->firstOrFail();

    expect($order->customer_id)->toBe($customer->id);

    $this->assertDatabaseHas('customer_addresses', [
        'customer_id' => $customer->id,
        'label' => 'Trabajo',
        'address' => 'Calle nueva 10',
        'is_default' => true,
    ]);
});

test('orders with saved address_id do not create duplicate addresses', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Dirección Guardada',
        'slug' => 'direccion-guardada',
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
        'name' => 'Taco',
        'price' => 25,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    DeliveryZone::create([
        'organization_id' => $organization->id,
        'name' => 'Centro',
        'fee' => 30,
        'center_lat' => 16.2520,
        'center_lng' => -92.1350,
        'radius_km' => 5,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $customer = Customer::create([
        'name' => 'Marta Cliente',
        'phone' => '9638889900',
        'password' => 'secreta123',
    ]);

    $address = CustomerAddress::create([
        'customer_id' => $customer->id,
        'label' => 'Casa',
        'address' => 'Av. Central 100',
        'city' => 'Comitán de Domínguez, Chiapas',
        'latitude' => 16.2520,
        'longitude' => -92.1350,
        'is_default' => true,
    ]);

    $this->actingAs($customer, 'customer')
        ->post(route('storefront.orders.store', $organization->slug), [
            'organization_id' => $organization->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'type' => 'delivery',
            'address_id' => $address->id,
            'delivery_address' => 'ignored',
            'delivery_city' => 'Comitán de Domínguez, Chiapas',
            'latitude' => 16.2520,
            'longitude' => -92.1350,
            'save_address' => true,
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => null,
                    'quantity' => 1,
                ],
            ],
        ])
        ->assertRedirect();

    expect(CustomerAddress::query()->where('customer_id', $customer->id)->count())->toBe(1);

    $this->assertDatabaseHas('orders', [
        'customer_id' => $customer->id,
        'delivery_address' => 'Av. Central 100',
    ]);
});

test('guests can place an order with daily menu items', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Menú del día pedidos',
        'slug' => 'menu-dia-pedidos',
        'status' => 'active',
    ]);

    $menu = \App\Models\DailyMenu::create([
        'organization_id' => $organization->id,
        'date' => today(),
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

    $response = $this->post(route('storefront.orders.store', $organization->slug), [
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
                'quantity' => 2,
            ],
        ],
    ]);

    $order = Order::query()->first();

    expect($order)->not->toBeNull();

    $response->assertRedirect(route('storefront.order.confirmation', $order));

    $this->assertDatabaseHas('orders', [
        'id' => $order->id,
        'subtotal' => '110.00',
        'total' => '110.00',
    ]);

    $this->assertDatabaseHas('order_items', [
        'order_id' => $order->id,
        'daily_menu_item_id' => $dailyItem->id,
        'product_id' => null,
        'product_name' => 'Sopa del día',
        'unit_price' => '55.00',
        'quantity' => 2,
        'subtotal' => '110.00',
    ]);

    expect($dailyItem->fresh()->stock)->toBe(3);
});

test('guests can place a scheduled preorder for informative categories outside hours', function () {
    \Illuminate\Support\Carbon::setTestNow(\Illuminate\Support\Carbon::parse('2026-06-09 12:00:00'));

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Pedido programado',
        'slug' => 'pedido-programado',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Comida',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'schedule_type' => 'informative',
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Enchiladas',
        'price' => 80,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $response = $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Roberto',
        'customer_phone' => '5511223344',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'is_preorder' => true,
        'scheduled_for' => '14:30',
        'items' => [
            [
                'source' => 'menu',
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ]);

    $order = Order::query()->first();

    expect($order)->not->toBeNull()
        ->and($order->is_preorder)->toBeTrue()
        ->and($order->scheduled_for?->format('H:i'))->toBe('14:30');

    $response->assertRedirect(route('storefront.order.confirmation', $order));

    \Illuminate\Support\Carbon::setTestNow();
});

test('preorder rejects scheduled time outside category window', function () {
    \Illuminate\Support\Carbon::setTestNow(\Illuminate\Support\Carbon::parse('2026-06-09 12:00:00'));

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Hora inválida',
        'slug' => 'hora-invalida',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Comida',
        'is_active' => true,
        'sort_order' => 0,
        'available_from' => '13:00:00',
        'available_until' => '17:00:00',
        'schedule_type' => 'informative',
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Sopa',
        'price' => 45,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Laura',
        'customer_phone' => '5511334455',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'is_preorder' => true,
        'scheduled_for' => '18:00',
        'items' => [
            [
                'source' => 'menu',
                'product_id' => $product->id,
                'product_variant_id' => null,
                'quantity' => 1,
            ],
        ],
    ])->assertSessionHasErrors([
        'scheduled_for' => 'La hora debe estar entre 01:00 pm y 05:00 pm.',
    ]);

    expect(Order::query()->count())->toBe(0);

    \Illuminate\Support\Carbon::setTestNow();
});
