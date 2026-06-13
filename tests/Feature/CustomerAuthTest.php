<?php

use App\Models\Customer;
use App\Models\Organization;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function activeOrganizationForCustomerAuth(): Organization
{
    $user = User::factory()->create();

    return Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Auth',
        'slug' => 'taqueria-auth',
        'status' => 'active',
    ]);
}

test('guests can view customer login and register pages', function () {
    $organization = activeOrganizationForCustomerAuth();

    $this->get(route('storefront.login', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Auth/Login')
            ->where('organization.slug', $organization->slug)
        );

    $this->get(route('storefront.register', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Auth/Register')
            ->where('organization.slug', $organization->slug)
        );
});

test('customers can register and are redirected to the storefront', function () {
    $organization = activeOrganizationForCustomerAuth();

    $response = $this->post(route('storefront.register.store', $organization->slug), [
        'name' => 'Ana Cliente',
        'phone' => '9631112233',
        'password' => 'secreta123',
    ]);

    $response->assertRedirect(route('storefront.show', $organization->slug));
    $this->assertAuthenticatedAs(Customer::query()->where('phone', '9631112233')->first(), 'customer');

    $this->get(route('storefront.show', $organization->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->where('customer.name', 'Ana Cliente')
            ->where('customer.phone', '9631112233')
        );
});

test('customers can login with phone and password', function () {
    $organization = activeOrganizationForCustomerAuth();

    Customer::create([
        'name' => 'Luis Cliente',
        'phone' => '9634445566',
        'password' => 'secreta123',
    ]);

    $response = $this->post(route('storefront.login.store', $organization->slug), [
        'phone' => '9634445566',
        'password' => 'secreta123',
    ]);

    $response->assertRedirect(route('storefront.show', $organization->slug));
    $this->assertAuthenticated('customer');
});

test('customer login fails with invalid credentials', function () {
    $organization = activeOrganizationForCustomerAuth();

    Customer::create([
        'name' => 'Luis Cliente',
        'phone' => '9634445566',
        'password' => 'secreta123',
    ]);

    $this->post(route('storefront.login.store', $organization->slug), [
        'phone' => '9634445566',
        'password' => 'incorrecta',
    ])->assertSessionHasErrors('phone');

    $this->assertGuest('customer');
});

test('guests are redirected to login when visiting checkout', function () {
    $organization = activeOrganizationForCustomerAuth();

    $this->get(route('storefront.checkout', $organization->slug))
        ->assertRedirect(route('storefront.login', $organization->slug));
});

test('customers are redirected to checkout after login when that was the intended page', function () {
    $organization = activeOrganizationForCustomerAuth();

    Customer::create([
        'name' => 'Ana Cliente',
        'phone' => '9631112233',
        'password' => 'secreta123',
    ]);

    $this->get(route('storefront.checkout', $organization->slug))
        ->assertRedirect(route('storefront.login', $organization->slug));

    $this->post(route('storefront.login.store', $organization->slug), [
        'phone' => '9631112233',
        'password' => 'secreta123',
    ])->assertRedirect(route('storefront.checkout', $organization->slug));
});

test('guests cannot place orders', function () {
    $organization = activeOrganizationForCustomerAuth();

    $this->post(route('storefront.orders.store', $organization->slug), [
        'organization_id' => $organization->id,
        'customer_name' => 'Invitado',
        'customer_phone' => '5512345678',
        'type' => 'pickup',
        'payment_method' => 'cash',
        'items' => [],
    ])->assertRedirect(route('storefront.login', $organization->slug));
});

test('customers can logout without affecting web guard', function () {
    $organization = activeOrganizationForCustomerAuth();
    $owner = User::factory()->create();

    $customer = Customer::create([
        'name' => 'Ana Cliente',
        'phone' => '9637778899',
        'password' => 'secreta123',
    ]);

    $this->actingAs($owner, 'web')
        ->actingAs($customer, 'customer')
        ->post(route('storefront.logout', $organization->slug))
        ->assertRedirect(route('storefront.show', $organization->slug));

    $this->assertGuest('customer');
    $this->assertAuthenticated('web');
});
