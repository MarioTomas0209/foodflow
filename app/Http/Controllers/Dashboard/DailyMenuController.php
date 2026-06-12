<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\DailyMenu;
use App\Models\DailyMenuItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DailyMenuController extends Controller
{
    public function index(): Response
    {
        $organization = auth()->user()->currentOrganization;

        $menus = $organization
            ->dailyMenus()
            ->whereBetween('date', [today()->subDays(30), today()->addDays(7)])
            ->withCount('items')
            ->orderByDesc('date')
            ->get()
            ->map(fn (DailyMenu $menu) => [
                'id' => $menu->id,
                'date' => $menu->date->format('Y-m-d'),
                'name' => $menu->name,
                'available_from' => $menu->available_from,
                'available_until' => $menu->available_until,
                'is_active' => $menu->is_active,
                'items_count' => $menu->items_count,
                'is_available_now' => $menu->isAvailableNow(),
            ]);

        return Inertia::render('Dashboard/DailyMenus/Index', [
            'menus' => $menus,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Dashboard/DailyMenus/Create', [
            'defaultDate' => today()->format('Y-m-d'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $organization = auth()->user()->currentOrganization;
        $validated = $this->validateMenu($request);

        $menu = $organization->dailyMenus()->create($this->menuAttributesFromValidated($validated));

        $this->syncItems($menu, $request, $validated['items'], $organization->id);

        return redirect()
            ->route('dashboard.daily-menus.index')
            ->with('success', 'Menú del día creado correctamente.');
    }

    public function edit(DailyMenu $dailyMenu): Response
    {
        $this->authorizeMenu($dailyMenu);

        $dailyMenu->load([
            'items' => fn ($query) => $query
                ->with(['variants' => fn ($variantQuery) => $variantQuery->orderBy('sort_order')])
                ->orderBy('sort_order'),
        ]);

        return Inertia::render('Dashboard/DailyMenus/Edit', [
            'dailyMenu' => $this->formatMenuForForm($dailyMenu),
        ]);
    }

    public function update(Request $request, DailyMenu $dailyMenu): RedirectResponse
    {
        $this->authorizeMenu($dailyMenu);

        $validated = $this->validateMenu($request, $dailyMenu);

        $dailyMenu->update($this->menuAttributesFromValidated($validated));

        $this->syncItems(
            $dailyMenu,
            $request,
            $validated['items'],
            auth()->user()->currentOrganization->id,
        );

        return redirect()
            ->route('dashboard.daily-menus.index')
            ->with('success', 'Menú del día actualizado correctamente.');
    }

    public function destroy(DailyMenu $dailyMenu): RedirectResponse
    {
        $this->authorizeMenu($dailyMenu);

        $dailyMenu->items->each(fn (DailyMenuItem $item) => $this->deleteStoredImage($item->image));

        $dailyMenu->delete();

        return redirect()
            ->route('dashboard.daily-menus.index')
            ->with('success', 'Menú del día eliminado correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMenu(Request $request, ?DailyMenu $menu = null): array
    {
        $organizationId = auth()->user()->currentOrganization->id;

        $validated = $request->validate([
            'date' => [
                'required',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($organizationId, $menu): void {
                    $query = DailyMenu::query()
                        ->where('organization_id', $organizationId)
                        ->whereDate('date', $value);

                    if ($menu !== null) {
                        $query->where('id', '!=', $menu->id);
                    }

                    if ($query->exists()) {
                        $fail('Ya existe un menú para esta fecha.');
                    }
                },
            ],
            'name' => ['nullable', 'string', 'max:255'],
            'available_from' => ['nullable', 'date_format:H:i'],
            'available_until' => ['nullable', 'date_format:H:i', 'after:available_from'],
            'is_active' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
        ]);

        $validated['items'] = $this->validateItems($request);

        return $validated;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function validateItems(Request $request): array
    {
        $items = $request->input('items', []);
        $validatedItems = [];

        foreach ($items as $index => $item) {
            $hasVariants = filter_var($item['has_variants'] ?? false, FILTER_VALIDATE_BOOLEAN);

            $rules = [
                "items.{$index}.id" => ['nullable', 'string'],
                "items.{$index}.name" => ['required', 'string', 'max:255'],
                "items.{$index}.description" => ['nullable', 'string'],
                "items.{$index}.has_variants" => ['boolean'],
                "items.{$index}.sort_order" => ['nullable', 'integer', 'min:0'],
                "items.{$index}.image" => ['nullable', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp'],
                "items.{$index}.remove_image" => ['nullable', 'boolean'],
            ];

            if ($hasVariants) {
                $rules["items.{$index}.price"] = ['nullable', 'numeric', 'min:0'];
                $rules["items.{$index}.stock"] = ['nullable', 'integer', 'min:0'];
                $rules["items.{$index}.variants"] = ['required', 'array', 'min:1'];
                $rules["items.{$index}.variants.*.name"] = ['required', 'string', 'max:255'];
                $rules["items.{$index}.variants.*.price"] = ['required', 'numeric', 'min:0'];
                $rules["items.{$index}.variants.*.stock"] = ['nullable', 'integer', 'min:0'];
            } else {
                $rules["items.{$index}.price"] = ['required', 'numeric', 'min:0'];
                $rules["items.{$index}.stock"] = ['nullable', 'integer', 'min:0'];
            }

            $validatedItems[] = $request->validate($rules)["items"][$index];
        }

        return $validatedItems;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function menuAttributesFromValidated(array $validated): array
    {
        return [
            'date' => $validated['date'],
            'name' => $validated['name'] ?? null,
            'available_from' => isset($validated['available_from'])
                ? $this->normalizeTime($validated['available_from'])
                : null,
            'available_until' => isset($validated['available_until'])
                ? $this->normalizeTime($validated['available_until'])
                : null,
            'is_active' => $validated['is_active'] ?? true,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(DailyMenu $menu, Request $request, array $items, string $organizationId): void
    {
        $submittedIds = collect($items)
            ->pluck('id')
            ->filter()
            ->values();

        $menu->items()
            ->whereNotIn('id', $submittedIds)
            ->get()
            ->each(function (DailyMenuItem $item) {
                $this->deleteStoredImage($item->image);
                $item->delete();
            });

        foreach ($items as $index => $itemData) {
            $hasVariants = (bool) ($itemData['has_variants'] ?? false);

            $payload = [
                'name' => $itemData['name'],
                'description' => $itemData['description'] ?? null,
                'has_variants' => $hasVariants,
                'price' => $hasVariants ? 0 : $itemData['price'],
                'stock' => $hasVariants ? null : ($itemData['stock'] ?? null),
                'sort_order' => $itemData['sort_order'] ?? $index,
            ];

            $imageFile = $request->file("items.{$index}.image");

            if (! empty($itemData['id'])) {
                $item = $menu->items()->where('id', $itemData['id'])->firstOrFail();

                if ($imageFile) {
                    $this->deleteStoredImage($item->image);
                    $payload['image'] = $imageFile->store("daily-menus/{$organizationId}", 'public');
                } elseif ($request->boolean("items.{$index}.remove_image")) {
                    $this->deleteStoredImage($item->image);
                    $payload['image'] = null;
                }

                $item->update($payload);
                $this->syncItemVariants($item, $itemData);

                continue;
            }

            if ($imageFile) {
                $payload['image'] = $imageFile->store("daily-menus/{$organizationId}", 'public');
            }

            $item = $menu->items()->create($payload);
            $this->syncItemVariants($item, $itemData);
        }
    }

    /**
     * @param  array<string, mixed>  $itemData
     */
    private function syncItemVariants(DailyMenuItem $item, array $itemData): void
    {
        $item->variants()->delete();

        if (! ($itemData['has_variants'] ?? false) || empty($itemData['variants'])) {
            return;
        }

        $item->variants()->createMany(
            collect($itemData['variants'])->map(fn (array $variant, int $index) => [
                'name' => $variant['name'],
                'price' => $variant['price'],
                'stock' => $variant['stock'] ?? null,
                'sort_order' => $index,
            ])->all(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMenuForForm(DailyMenu $menu): array
    {
        return [
            'id' => $menu->id,
            'date' => $menu->date->format('Y-m-d'),
            'name' => $menu->name,
            'available_from' => $menu->available_from ? substr((string) $menu->available_from, 0, 5) : '',
            'available_until' => $menu->available_until ? substr((string) $menu->available_until, 0, 5) : '',
            'is_active' => $menu->is_active,
            'items' => $menu->items->map(fn (DailyMenuItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'description' => $item->description ?? '',
                'has_variants' => $item->has_variants,
                'price' => (string) $item->price,
                'stock' => $item->stock === null ? '' : (string) $item->stock,
                'sort_order' => $item->sort_order,
                'image' => $item->imagePublicUrl(),
                'variants' => $item->variants->map(fn ($variant) => [
                    'name' => $variant->name,
                    'price' => (string) $variant->price,
                    'stock' => $variant->stock === null ? '' : (string) $variant->stock,
                ])->values(),
            ])->values(),
        ];
    }

    private function authorizeMenu(DailyMenu $menu): void
    {
        abort_unless(
            $menu->organization_id === auth()->user()->currentOrganization->id,
            403,
        );
    }

    private function deleteStoredImage(?string $image): void
    {
        if ($image === null || str_starts_with($image, 'http://') || str_starts_with($image, 'https://')) {
            return;
        }

        Storage::disk('public')->delete($image);
    }

    private function normalizeTime(string $time): string
    {
        return strlen($time) === 5 ? $time.':00' : $time;
    }
}
