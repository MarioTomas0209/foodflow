<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    public function index(): Response
    {
        $organization = auth()->user()->currentOrganization;

        $categories = $organization
            ->categories()
            ->with(['products' => fn ($query) => $query->with('variants')->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get()
            ->each(function ($category) {
                $category->products->each(function ($product) {
                    $product->setAttribute('image', $product->imagePublicUrl());
                });
            });

        return Inertia::render('Dashboard/Menu/Index', [
            'categories' => $categories,
        ]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        auth()->user()->currentOrganization->categories()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('dashboard.menu.index')->with('success', 'Categoría creada correctamente.');
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $organization = auth()->user()->currentOrganization;
        $validated = $this->validateProduct($request, $organization);

        $imagePath = null;

        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store(
                "products/{$organization->id}",
                'public',
            );
        }

        $product = $organization->products()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['has_variants'] ? 0 : $validated['price'],
            'has_variants' => $validated['has_variants'],
            'stock' => $validated['has_variants'] ? null : ($validated['stock'] ?? null),
            'category_id' => $validated['category_id'],
            'is_active' => $validated['is_active'] ?? true,
            'image' => $imagePath,
        ]);

        $this->syncProductVariants($product, $validated);

        return redirect()->route('dashboard.menu.index')->with('success', 'Producto creado correctamente.');
    }

    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $organization = auth()->user()->currentOrganization;

        abort_unless($product->organization_id === $organization->id, 403);

        $validated = $this->validateProduct($request, $organization);

        $payload = [
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['has_variants'] ? 0 : $validated['price'],
            'has_variants' => $validated['has_variants'],
            'stock' => $validated['has_variants'] ? null : ($validated['stock'] ?? null),
            'category_id' => $validated['category_id'],
            'is_active' => $validated['is_active'] ?? true,
        ];

        if ($request->hasFile('image')) {
            $this->deleteStoredProductImage($product->image);

            $payload['image'] = $request->file('image')->store(
                "products/{$product->organization_id}",
                'public',
            );
        }

        $product->update($payload);

        $this->syncProductVariants($product, $validated);

        return redirect()->route('dashboard.menu.index')->with('success', 'Producto actualizado correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateProduct(Request $request, $organization): array
    {
        $hasVariants = $request->boolean('has_variants');

        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => [$hasVariants ? 'nullable' : 'required', 'numeric', 'min:0'],
            'has_variants' => ['boolean'],
            'variants' => [
                Rule::excludeIf(! $hasVariants),
                'required',
                'array',
                'min:1',
            ],
            'variants.*.name' => [
                Rule::excludeIf(! $hasVariants),
                'required',
                'string',
                'max:255',
            ],
            'variants.*.price' => [
                Rule::excludeIf(! $hasVariants),
                'required',
                'numeric',
                'min:0',
            ],
            'stock' => [
                Rule::excludeIf($hasVariants),
                'nullable',
                'integer',
                'min:0',
            ],
            'variants.*.stock' => [
                Rule::excludeIf(! $hasVariants),
                'nullable',
                'integer',
                'min:0',
            ],
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('organization_id', $organization->id),
            ],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp'],
        ]) + ['has_variants' => $hasVariants];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function syncProductVariants(Product $product, array $validated): void
    {
        $product->variants()->delete();

        if ($validated['has_variants'] && ! empty($validated['variants'])) {
            $product->variants()->createMany(
                collect($validated['variants'])->map(fn (array $variant, int $index) => [
                    'name' => $variant['name'],
                    'price' => $variant['price'],
                    'stock' => $variant['stock'] ?? null,
                    'sort_order' => $index,
                ])->all()
            );
        }
    }

    private function deleteStoredProductImage(?string $image): void
    {
        if ($image === null || str_starts_with($image, 'http://') || str_starts_with($image, 'https://')) {
            return;
        }

        Storage::disk('public')->delete($image);
    }
}
