<?php

use App\Models\Category;
use App\Models\Organization;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createMenuDashboardUser(): array
{
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Menú',
        'slug' => 'taqueria-menu-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    $category = Category::create([
        'organization_id' => $organization->id,
        'name' => 'Tacos',
        'is_active' => true,
        'sort_order' => 0,
    ]);

    return [$user->fresh(), $organization, $category];
}

test('menu index exposes product images as public urls', function () {
    Storage::fake('public');

    [$user, $organization, $category] = createMenuDashboardUser();

    $path = UploadedFile::fake()->image('taco.jpg')->store("products/{$organization->id}", 'public');

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Taco al pastor',
        'price' => 25,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
        'image' => $path,
    ]);

    $expectedUrl = Storage::disk('public')->url($path);

    $this->actingAs($user)
        ->get(route('dashboard.menu.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Menu/Index')
            ->where('categories.0.products.0.id', $product->id)
            ->where('categories.0.products.0.image', $expectedUrl)
        );
});

test('owners can create products with an image', function () {
    Storage::fake('public');

    [$user, $organization, $category] = createMenuDashboardUser();

    $this->actingAs($user)
        ->post(route('dashboard.menu.products.store'), [
            'name' => 'Taco de bistec',
            'description' => 'Con cebolla',
            'price' => '30',
            'has_variants' => false,
            'category_id' => $category->id,
            'is_active' => true,
            'image' => UploadedFile::fake()->image('bistec.jpg'),
        ])
        ->assertRedirect(route('dashboard.menu.index'));

    $product = Product::query()->where('name', 'Taco de bistec')->first();

    expect($product)->not->toBeNull()
        ->and($product->image)->not->toBeNull();

    Storage::disk('public')->assertExists($product->image);
});

test('owners can replace a product image and delete the previous file', function () {
    Storage::fake('public');

    [$user, $organization, $category] = createMenuDashboardUser();

    $oldPath = UploadedFile::fake()->image('old.jpg')->store("products/{$organization->id}", 'public');

    $product = Product::create([
        'organization_id' => $organization->id,
        'category_id' => $category->id,
        'name' => 'Quesadilla',
        'price' => 40,
        'has_variants' => false,
        'is_active' => true,
        'sort_order' => 0,
        'image' => $oldPath,
    ]);

    $this->actingAs($user)
        ->post(route('dashboard.menu.products.update', $product), [
            'name' => 'Quesadilla',
            'price' => '40',
            'has_variants' => false,
            'category_id' => $category->id,
            'is_active' => true,
            'image' => UploadedFile::fake()->image('new.jpg'),
        ])
        ->assertRedirect(route('dashboard.menu.index'));

    $product->refresh();

    expect($product->image)->not->toBe($oldPath);

    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($product->image);
});
