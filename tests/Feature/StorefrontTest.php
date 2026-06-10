<?php

use App\Models\Category;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can view an active organization storefront', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería El Patrón',
        'slug' => 'taqueria-el-patron',
        'description' => 'La mejor taquería del barrio',
        'phone' => '+52 55 1234 5678',
        'address' => 'Av. Reforma 123',
        'city' => 'Ciudad de México',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Tacos',
        'description' => 'Hechos al momento',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Taco al pastor',
        'description' => 'Con piña',
        'price' => 25,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Public/Storefront')
            ->where('organization.slug', 'taqueria-el-patron')
            ->where('organization.name', 'Taquería El Patrón')
            ->has('categories', 1)
            ->where('categories.0.name', 'Tacos')
            ->has('categories.0.products', 1)
            ->where('categories.0.products.0.id', $product->id)
        );
});

test('invalid slug formats do not match the storefront route', function () {
    $this->get('/Invalid-Slug')->assertNotFound();
    $this->get('/slug_with_underscore')->assertNotFound();
});

test('inactive organizations return not found on storefront', function () {
    $user = User::factory()->create();

    Organization::create([
        'owner_id' => $user->id,
        'name' => 'Negocio cerrado',
        'slug' => 'negocio-cerrado',
        'status' => 'inactive',
    ]);

    $this->get(route('storefront.show', 'negocio-cerrado'))->assertNotFound();
});

test('storefront only includes active categories products and variants', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Menú filtrado',
        'slug' => 'menu-filtrado',
        'status' => 'active',
    ]);

    $activeCategory = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Activos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    Category::create([
        'organization_id' => $organization->id,
        'name' => 'Inactiva',
        'is_active' => false,
        'sort_order' => 1,
    ]);

    $activeProduct = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $activeCategory->id,
        'name' => 'Producto activo',
        'price' => 0,
        'has_variants' => true,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    Product::create([
        'organization_id' => $organization->id,
        'category_id' => $activeCategory->id,
        'name' => 'Producto inactivo',
        'price' => 10,
        'has_variants' => false,
        'is_active' => false,
        'sort_order' => 1,
    ]);

    $activeVariant = ProductVariant::create([
        'product_id' => $activeProduct->id,
        'name' => 'Orden',
        'price' => 45,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    ProductVariant::create([
        'product_id' => $activeProduct->id,
        'name' => 'Inactiva',
        'price' => 99,
        'is_active' => false,
        'sort_order' => 1,
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('categories', 1)
            ->where('categories.0.name', 'Activos')
            ->has('categories.0.products', 1)
            ->where('categories.0.products.0.name', 'Producto activo')
            ->has('categories.0.products.0.variants', 1)
            ->where('categories.0.products.0.variants.0.id', $activeVariant->id)
        );
});

test('storefront hides fixed price products with zero stock', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Stock agotado',
        'slug' => 'stock-agotado',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Platillos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Agotado',
        'price' => 50,
        'stock' => 0,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Disponible',
        'price' => 50,
        'stock' => 5,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 1,
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('categories', 1)
            ->has('categories.0.products', 1)
            ->where('categories.0.products.0.name', 'Disponible')
        );
});

test('storefront still shows variant products when some variants are out of stock', function () {
    $user = User::factory()->create();

    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Variantes mixtas',
        'slug' => 'variantes-mixtas',
        'status' => 'active',
    ]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Milanesas',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Milanesa',
        'price' => 0,
        'has_variants' => true,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    ProductVariant::create([
        'product_id' => $product->id,
        'name' => 'Orden',
        'price' => 90,
        'stock' => 0,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    ProductVariant::create([
        'product_id' => $product->id,
        'name' => 'Media',
        'price' => 55,
        'stock' => 3,
        'is_active' => true,
        'sort_order' => 1,
    ]);

    $this->get(route('storefront.show', $organization->slug))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('categories', 1)
            ->has('categories.0.products', 1)
            ->has('categories.0.products.0.variants', 2)
            ->where('categories.0.products.0.variants.0.stock', 0)
            ->where('categories.0.products.0.variants.1.stock', 3)
        );
});
