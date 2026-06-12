<?php

use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function customerOrderContext(): array
{
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Pedidos Cliente',
        'slug' => 'taqueria-pedidos-cliente',
        'status' => 'active',
    ]);

    $customer = Customer::create([
        'name' => 'Ana Cliente',
        'phone' => '9635556677',
        'password' => 'secreta123',
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
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $order = Order::create([
        'organization_id' => $organization->id,
        'customer_id' => $customer->id,
        'customer_name' => $customer->name,
        'customer_phone' => $customer->phone,
        'type' => 'pickup',
        'status' => 'pending',
        'payment_method' => 'cash',
        'subtotal' => 50,
        'delivery_fee' => 0,
        'total' => 50,
    ]);

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'unit_price' => 25,
        'quantity' => 2,
        'subtotal' => 50,
    ]);

    return [$organization, $customer, $order->fresh(['items', 'organization'])];
}

test('guests are redirected to login when viewing customer orders', function () {
    [$organization] = customerOrderContext();

    $this->get(route('storefront.orders.index', $organization->slug))
        ->assertRedirect(route('storefront.login', $organization->slug));
});

test('authenticated customers can view their orders for the current business', function () {
    [$organization, $customer, $order] = customerOrderContext();

    $this->actingAs($customer, 'customer')
        ->get(route('storefront.orders.index', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Orders/Index')
            ->where('organization.slug', $organization->slug)
            ->has('orders.data', 1)
            ->where('orders.data.0.id', $order->id)
            ->where('orders.data.0.organization.name', $organization->name)
        );
});

test('authenticated customers can view an order detail', function () {
    [$organization, $customer, $order] = customerOrderContext();

    $this->actingAs($customer, 'customer')
        ->get(route('storefront.orders.show', [$organization->slug, $order->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Orders/Show')
            ->where('order.id', $order->id)
            ->where('order.status', 'pending')
            ->has('order.items', 1)
        );
});

test('customers cannot view orders from another customer', function () {
    [$organization, , $order] = customerOrderContext();

    $otherCustomer = Customer::create([
        'name' => 'Otro Cliente',
        'phone' => '9639998877',
        'password' => 'secreta123',
    ]);

    $this->actingAs($otherCustomer, 'customer')
        ->get(route('storefront.orders.show', [$organization->slug, $order->id]))
        ->assertNotFound();
});

test('customers only see orders from the current business slug', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Negocio A',
        'slug' => 'negocio-a',
        'status' => 'active',
    ]);

    $otherOrganization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Negocio B',
        'slug' => 'negocio-b',
        'status' => 'active',
    ]);

    $customer = Customer::create([
        'name' => 'Ana Cliente',
        'phone' => '9631112233',
        'password' => 'secreta123',
    ]);

    Order::create([
        'organization_id' => $otherOrganization->id,
        'customer_id' => $customer->id,
        'customer_name' => $customer->name,
        'customer_phone' => $customer->phone,
        'type' => 'pickup',
        'status' => 'pending',
        'payment_method' => 'cash',
        'subtotal' => 30,
        'delivery_fee' => 0,
        'total' => 30,
    ]);

    $this->actingAs($customer, 'customer')
        ->get(route('storefront.orders.index', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('orders.data', 0));
});
