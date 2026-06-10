<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
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
            ->with(['products' => fn ($query) => $query->orderBy('sort_order')])
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

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'category_id' => [
                'required',
                Rule::exists('categories', 'id')->where('organization_id', $organization->id),
            ],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $organization->products()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'category_id' => $validated['category_id'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('dashboard.menu.index')->with('success', 'Producto creado correctamente.');
    }
}
