<?php

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

test('customers can authenticate with the customer guard using phone', function () {
    $customer = Customer::create([
        'name' => 'Ana Cliente',
        'phone' => '9631234567',
        'password' => 'secreta123',
    ]);

    expect(Auth::guard('customer')->attempt([
        'phone' => '9631234567',
        'password' => 'secreta123',
    ]))->toBeTrue()
        ->and(Auth::guard('customer')->id())->toBe($customer->id)
        ->and(Hash::check('secreta123', $customer->password))->toBeTrue();
});

test('customer can have addresses and orders', function () {
    $customer = Customer::create([
        'name' => 'Luis Cliente',
        'phone' => '9637654321',
        'password' => 'secreta123',
    ]);

    $address = CustomerAddress::create([
        'customer_id' => $customer->id,
        'label' => 'Casa',
        'address' => '2da avenida poniente sur #54',
        'city' => 'Comitán de Domínguez, Chiapas',
        'maps_url' => 'https://maps.app.goo.gl/example',
        'is_default' => true,
    ]);

    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Clientes',
        'slug' => 'taqueria-clientes',
        'status' => 'active',
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

    expect($customer->addresses)->toHaveCount(1)
        ->and($customer->addresses->first()->is($address))->toBeTrue()
        ->and($customer->orders->first()->is($order))->toBeTrue()
        ->and($order->customer->is($customer))->toBeTrue();
});
