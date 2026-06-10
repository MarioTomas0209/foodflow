<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ->get();

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

        $product = $organization->products()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['has_variants'] ? 0 : $validated['price'],
            'has_variants' => $validated['has_variants'],
            'category_id' => $validated['category_id'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $this->syncProductVariants($product, $validated);

        return redirect()->route('dashboard.menu.index')->with('success', 'Producto creado correctamente.');
    }

    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $organization = auth()->user()->currentOrganization;

        abort_unless($product->organization_id === $organization->id, 403);

        $validated = $this->validateProduct($request, $organization);

        $product->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['has_variants'] ? 0 : $validated['price'],
            'has_variants' => $validated['has_variants'],
            'category_id' => $validated['category_id'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

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
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('organization_id', $organization->id),
            ],
            'is_active' => ['nullable', 'boolean'],
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
                    'sort_order' => $index,
                ])->all()
            );
        }
    }
}
