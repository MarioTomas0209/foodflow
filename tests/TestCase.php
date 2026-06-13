<?php

namespace Tests;

use App\Models\Customer;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function makeStorefrontCustomer(array $attributes = []): Customer
    {
        static $counter = 0;
        $counter++;

        return Customer::create(array_merge([
            'name' => 'Cliente Test',
            'phone' => '963'.str_pad((string) $counter, 7, '0', STR_PAD_LEFT),
            'password' => 'password',
        ], $attributes));
    }

    protected function asCustomer(?Customer $customer = null): static
    {
        $this->actingAs($customer ?? $this->makeStorefrontCustomer(), 'customer');

        return $this;
    }
}
