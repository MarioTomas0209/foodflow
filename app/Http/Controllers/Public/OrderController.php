<?php

namespace App\Http\Controllers\Public;

use App\Events\NewOrderReceived;
use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use App\Models\DailyMenuItem;
use App\Models\Order;
use App\Models\Organization;
use App\Models\Product;
use App\Support\GoogleMapsUrlParser;
use App\Support\OrderItemImageResolver;
use App\Support\TimeFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    private const DELIVERY_CITY = 'Comitán de Domínguez, Chiapas';

    public function checkout(string $slug): Response|RedirectResponse
    {
        $organization = Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $customer = Auth::guard('customer')->user();

        return Inertia::render('Public/Checkout', [
            'organization' => array_merge($organization->only([
                'id',
                'name',
                'slug',
                'description',
                'phone',
                'address',
                'city',
            ]), [
                'logo' => $organization->logoPublicUrl(),
            ]),
            'zones' => $organization->deliveryZones()
                ->where('is_active', true)
                ->get(['id', 'name', 'description', 'fee', 'center_lat', 'center_lng', 'radius_km']),
            'customer' => $customer ? [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
            ] : null,
            'addresses' => $customer
                ? $customer->addresses()->orderByDesc('is_default')->orderByDesc('created_at')->get([
                    'id', 'label', 'address', 'city', 'latitude', 'longitude', 'maps_url', 'is_default',
                ])
                : [],
            'cart_context' => $this->buildCartContext($organization),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildCartContext(Organization $organization): array
    {
        $categories = $organization->categories()
            ->where('is_active', true)
            ->whereNotNull('available_from')
            ->where('schedule_type', 'informative')
            ->get(['id', 'available_from', 'available_until', 'schedule_type'])
            ->map(fn ($category) => [
                'id' => $category->id,
                'available_from' => $category->available_from
                    ? substr((string) $category->available_from, 0, 5)
                    : null,
                'available_until' => $category->available_until
                    ? substr((string) $category->available_until, 0, 5)
                    : null,
                'schedule_type' => $category->schedule_type,
                'is_available_now' => $category->isAvailableNow(),
            ])
            ->values()
            ->all();

        return [
            'categories' => $categories,
            'product_categories' => Product::query()
                ->where('organization_id', $organization->id)
                ->where('is_active', true)
                ->pluck('category_id', 'id'),
        ];
    }

    public function resolveMapsUrl(Request $request, string $slug): JsonResponse
    {
        $organization = Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $validated = $request->validate([
            'url' => ['required', 'string', 'max:2048'],
        ]);

        $zones = $organization->deliveryZones()
            ->where('is_active', true)
            ->get(['center_lat', 'center_lng', 'radius_km']);

        $coords = GoogleMapsUrlParser::parse($validated['url'], $this->buildGeocodeContext($zones));

        if ($coords !== null) {
            $zone = $organization->findDeliveryZoneFor($coords['latitude'], $coords['longitude']);

            return response()->json([
                'latitude' => $coords['latitude'],
                'longitude' => $coords['longitude'],
                'zone_id' => $zone?->id,
                'maps_url' => trim($validated['url']),
            ]);
        }

        if (GoogleMapsUrlParser::isShareUrl($validated['url'])) {
            return response()->json([
                'latitude' => null,
                'longitude' => null,
                'zone_id' => null,
                'maps_url' => trim($validated['url']),
            ]);
        }

        return response()->json([
            'message' => 'No pudimos leer las coordenadas del enlace.',
        ], 422);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, \App\Models\DeliveryZone>  $zones
     * @return array{
     *   bias_lat: float,
     *   bias_lng: float,
     *   bias_radius_km: float,
     *   zones: list<array{center_lat: float|string, center_lng: float|string, radius_km: float|string}>
     * }
     */
    private function buildGeocodeContext($zones): array
    {
        if ($zones->isEmpty()) {
            return [
                'bias_lat' => 16.2489,
                'bias_lng' => -92.1345,
                'bias_radius_km' => 20.0,
                'zones' => [],
            ];
        }

        $centerLat = (float) $zones->avg(fn ($zone) => (float) $zone->center_lat);
        $centerLng = (float) $zones->avg(fn ($zone) => (float) $zone->center_lng);
        $maxRadius = (float) $zones->max(fn ($zone) => (float) $zone->radius_km);

        return [
            'bias_lat' => $centerLat,
            'bias_lng' => $centerLng,
            'bias_radius_km' => max($maxRadius + 5, 15.0),
            'zones' => $zones->map(fn ($zone) => [
                'center_lat' => $zone->center_lat,
                'center_lng' => $zone->center_lng,
                'radius_km' => $zone->radius_km,
            ])->values()->all(),
        ];
    }

    public function store(Request $request, string $slug): RedirectResponse
    {
        $organization = Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $customer = Auth::guard('customer')->user();

        $validated = $request->validate([
            'organization_id' => ['required', Rule::exists('organizations', 'id')],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:20'],
            'customer_notes' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', Rule::in(['pickup', 'delivery'])],
            'delivery_address' => ['required_if:type,delivery', 'nullable', 'string', 'max:255'],
            'delivery_city' => [
                Rule::requiredIf($request->input('type') === 'delivery'),
                'nullable',
                'string',
                Rule::in([self::DELIVERY_CITY]),
            ],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'zone_id' => ['nullable', 'exists:delivery_zones,id'],
            'delivery_maps_url' => [
                Rule::requiredIf($request->input('type') === 'delivery'),
                'nullable',
                'string',
                'max:2048',
            ],
            'address_id' => array_merge(
                ['nullable'],
                $customer
                    ? [Rule::exists('customer_addresses', 'id')->where('customer_id', $customer->id)]
                    : ['prohibited'],
            ),
            'save_address' => ['nullable', 'boolean'],
            'address_label' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['required', Rule::in(['cash', 'transfer'])],
            'items' => ['required', 'array', 'min:1'],
            'items.*.source' => ['nullable', Rule::in(['menu', 'daily'])],
            'items.*.product_id' => ['required', 'string'],
            'items.*.product_variant_id' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'is_preorder' => ['boolean'],
            'scheduled_for' => [
                Rule::requiredIf($request->boolean('is_preorder')),
                'nullable',
                'date_format:H:i',
            ],
        ]);

        abort_unless($validated['organization_id'] === $organization->id, 403);

        $isPreorder = (bool) ($validated['is_preorder'] ?? false);
        $scheduledFor = null;

        if ($isPreorder) {
            $preorderWindow = $this->resolvePreorderWindow($organization, $validated['items']);

            if ($preorderWindow === null) {
                throw ValidationException::withMessages([
                    'is_preorder' => 'Este pedido no admite programación de hora.',
                ]);
            }

            $scheduledTime = $validated['scheduled_for'] ?? null;

            if ($scheduledTime === null) {
                throw ValidationException::withMessages([
                    'scheduled_for' => 'Selecciona la hora de tu pedido.',
                ]);
            }

            if ($scheduledTime < $preorderWindow['available_from'] || $scheduledTime > $preorderWindow['available_until']) {
                throw ValidationException::withMessages([
                    'scheduled_for' => sprintf(
                        'La hora debe estar entre %s y %s.',
                        TimeFormatter::format12Hour($preorderWindow['available_from']),
                        TimeFormatter::format12Hour($preorderWindow['available_until']),
                    ),
                ]);
            }

            $scheduledFor = today()->setTimeFromTimeString($scheduledTime);
        }

        if ($customer && ! empty($validated['address_id'])) {
            /** @var CustomerAddress $savedAddress */
            $savedAddress = $customer->addresses()->findOrFail($validated['address_id']);

            $validated['delivery_address'] = $savedAddress->address;
            $validated['delivery_city'] = $savedAddress->city;
            $validated['latitude'] = $savedAddress->latitude !== null ? (float) $savedAddress->latitude : null;
            $validated['longitude'] = $savedAddress->longitude !== null ? (float) $savedAddress->longitude : null;
            $validated['delivery_maps_url'] = $savedAddress->maps_url;
        }

        $menuItems = collect($validated['items'])
            ->filter(fn (array $item) => ($item['source'] ?? 'menu') === 'menu')
            ->values();

        $dailyItems = collect($validated['items'])
            ->filter(fn (array $item) => ($item['source'] ?? 'menu') === 'daily')
            ->values();

        $productIds = $menuItems->pluck('product_id')->unique()->values();

        $products = Product::query()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->whereIn('id', $productIds)
            ->with([
                'category',
                'variants' => fn ($query) => $query->where('is_active', true),
            ])
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            throw ValidationException::withMessages([
                'items' => 'Uno o más productos no están disponibles.',
            ]);
        }

        foreach ($menuItems as $index => $item) {
            /** @var Product $product */
            $product = $products->get($item['product_id']);
            $category = $product->category;

            if ($category !== null && ! $category->canOrderNow()) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => "{$product->name} ya no acepta pedidos en este horario.",
                ]);
            }
        }

        $todayMenu = $organization->todayMenu();
        $dailyMenuItems = collect();

        if ($dailyItems->isNotEmpty()) {
            if ($todayMenu === null) {
                throw ValidationException::withMessages([
                    'items' => 'El menú del día no está disponible.',
                ]);
            }

            $dailyItemIds = $dailyItems->pluck('product_id')->unique()->values();

            $dailyMenuItems = DailyMenuItem::query()
                ->where('daily_menu_id', $todayMenu->id)
                ->whereIn('id', $dailyItemIds)
                ->with('variants')
                ->get()
                ->keyBy('id');

            if ($dailyMenuItems->count() !== $dailyItemIds->count()) {
                throw ValidationException::withMessages([
                    'items' => 'Uno o más platillos del menú del día no están disponibles.',
                ]);
            }

            if (! $todayMenu->canOrderNow()) {
                throw ValidationException::withMessages([
                    'items' => 'El menú del día ya no acepta pedidos.',
                ]);
            }
        }

        $resolvedItems = [];
        $subtotal = 0;

        foreach ($validated['items'] as $index => $item) {
            $source = $item['source'] ?? 'menu';

            if ($source === 'daily') {
                $resolved = $this->resolveDailyMenuItem($dailyMenuItems, $item, $index);
            } else {
                /** @var Product $product */
                $product = $products->get($item['product_id']);
                $resolved = $this->resolveMenuProduct($product, $item, $index);
            }

            $subtotal += $resolved['subtotal'];
            $resolvedItems[] = $resolved;
        }

        $deliveryFee = 0;
        $deliveryZoneId = null;

        if ($validated['type'] === 'delivery') {
            $zone = null;
            $latitude = $validated['latitude'] ?? null;
            $longitude = $validated['longitude'] ?? null;
            $mapsUrl = trim($validated['delivery_maps_url'] ?? '');

            if ($mapsUrl === '') {
                throw ValidationException::withMessages([
                    'delivery_maps_url' => 'Agrega el enlace de Google Maps de tu ubicación.',
                ]);
            }

            if ($latitude === null || $longitude === null) {
                $deliveryZones = $organization->deliveryZones()
                    ->where('is_active', true)
                    ->get(['center_lat', 'center_lng', 'radius_km']);

                $parsedCoords = GoogleMapsUrlParser::parse(
                    $mapsUrl,
                    $this->buildGeocodeContext($deliveryZones),
                );

                if ($parsedCoords !== null) {
                    $latitude = $parsedCoords['latitude'];
                    $longitude = $parsedCoords['longitude'];
                    $validated['latitude'] = $latitude;
                    $validated['longitude'] = $longitude;
                }
            }

            if ($latitude === null || $longitude === null) {
                throw ValidationException::withMessages([
                    'delivery_maps_url' => 'No pudimos leer las coordenadas del enlace. Verifica que sea un enlace válido de Google Maps.',
                ]);
            }

            $zone = $organization->findDeliveryZoneFor($latitude, $longitude);

            if ($zone === null) {
                throw ValidationException::withMessages([
                    'delivery_address' => 'Tu ubicación está fuera de nuestras zonas de entrega.',
                ]);
            }

            $deliveryFee = (float) $zone->fee;
            $deliveryZoneId = $zone->id;
        }

        $total = round($subtotal + $deliveryFee, 2);

        $order = DB::transaction(function () use ($organization, $validated, $resolvedItems, $subtotal, $deliveryFee, $deliveryZoneId, $total, $isPreorder, $scheduledFor) {
            $order = Order::create([
                'organization_id' => $organization->id,
                'customer_id' => Auth::guard('customer')->id(),
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_notes' => $validated['customer_notes'] ?? null,
                'type' => $validated['type'],
                'delivery_address' => $validated['type'] === 'delivery' ? $validated['delivery_address'] : null,
                'delivery_city' => $validated['type'] === 'delivery' ? $validated['delivery_city'] : null,
                'latitude' => $validated['type'] === 'delivery' ? ($validated['latitude'] ?? null) : null,
                'longitude' => $validated['type'] === 'delivery' ? ($validated['longitude'] ?? null) : null,
                'delivery_maps_url' => $validated['type'] === 'delivery' ? ($validated['delivery_maps_url'] ?? null) : null,
                'delivery_zone_id' => $deliveryZoneId,
                'status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'total' => $total,
                'is_preorder' => $isPreorder,
                'scheduled_for' => $scheduledFor,
            ]);

            foreach ($resolvedItems as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'],
                    'daily_menu_item_id' => $item['daily_menu_item_id'],
                    'daily_menu_item_variant_id' => $item['daily_menu_item_variant_id'],
                    'product_name' => $item['product_name'],
                    'variant_name' => $item['variant_name'],
                    'product_image' => $item['product_image'],
                    'unit_price' => $item['unit_price'],
                    'quantity' => $item['quantity'],
                    'subtotal' => $item['subtotal'],
                ]);

                $stockTarget = $item['stock_target'];

                if ($stockTarget->stock !== null) {
                    $stockTarget->decrement('stock', $item['quantity']);
                }
            }

            return $order;
        });

        if ($customer && $validated['type'] === 'delivery') {
            if (! empty($validated['address_id'])) {
                // Dirección existente — no hacer nada
            } elseif ($validated['save_address'] ?? false) {
                $customer->addresses()->create([
                    'label' => $validated['address_label'] ?? null,
                    'address' => $validated['delivery_address'],
                    'city' => $validated['delivery_city'],
                    'latitude' => $validated['latitude'] ?? null,
                    'longitude' => $validated['longitude'] ?? null,
                    'maps_url' => $validated['delivery_maps_url'] ?? null,
                    'is_default' => $customer->addresses()->count() === 0,
                ]);
            }
        }

        $order->load('items');
        broadcast(new NewOrderReceived($order))->toOthers();

        return redirect()->route('storefront.order.confirmation', $order);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{available_from: string, available_until: string}|null
     */
    private function resolvePreorderWindow(Organization $organization, array $items): ?array
    {
        $cartContext = $this->buildCartContext($organization);
        $categoryMap = collect($cartContext['categories'])->keyBy('id');
        $productCategories = collect($cartContext['product_categories']);
        $affectedCategoryIds = collect();

        foreach ($items as $item) {
            if (($item['source'] ?? 'menu') !== 'menu') {
                continue;
            }

            $categoryId = $productCategories->get($item['product_id']);

            if ($categoryId === null) {
                continue;
            }

            $category = $categoryMap->get($categoryId);

            if ($category === null) {
                continue;
            }

            if ($category['schedule_type'] !== 'informative' || $category['is_available_now']) {
                continue;
            }

            if (empty($category['available_from']) || empty($category['available_until'])) {
                continue;
            }

            $affectedCategoryIds->push($categoryId);
        }

        if ($affectedCategoryIds->isEmpty()) {
            return null;
        }

        $earliestFrom = '23:59';
        $latestUntil = '00:00';

        foreach ($affectedCategoryIds->unique() as $categoryId) {
            $category = $categoryMap->get($categoryId);
            $from = substr((string) $category['available_from'], 0, 5);
            $until = substr((string) $category['available_until'], 0, 5);

            if ($from < $earliestFrom) {
                $earliestFrom = $from;
            }

            if ($until > $latestUntil) {
                $latestUntil = $until;
            }
        }

        return [
            'available_from' => $earliestFrom,
            'available_until' => $latestUntil,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function resolveMenuProduct(Product $product, array $item, int $index): array
    {
        if ($product->has_variants) {
            if (empty($item['product_variant_id'])) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'Debes seleccionar una variante.',
                ]);
            }

            $variant = $product->variants->firstWhere('id', $item['product_variant_id']);

            if (! $variant) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'La variante seleccionada no está disponible.',
                ]);
            }

            if ($variant->stock !== null && $variant->stock < $item['quantity']) {
                throw ValidationException::withMessages([
                    "items.{$index}.quantity" => "Stock insuficiente para {$product->name} ({$variant->name}).",
                ]);
            }

            $unitPrice = (float) $variant->price;
            $variantName = $variant->name;
            $variantId = $variant->id;
            $stockTarget = $variant;
        } else {
            if (! empty($item['product_variant_id'])) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'Este producto no tiene variantes.',
                ]);
            }

            if ($product->stock !== null && $product->stock < $item['quantity']) {
                throw ValidationException::withMessages([
                    "items.{$index}.quantity" => "Stock insuficiente para {$product->name}.",
                ]);
            }

            if ($product->stock === 0) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => "{$product->name} está agotado.",
                ]);
            }

            $unitPrice = (float) $product->price;
            $variantName = null;
            $variantId = null;
            $stockTarget = $product;
        }

        $lineSubtotal = round($unitPrice * $item['quantity'], 2);

        return [
            'product_id' => $product->id,
            'product_variant_id' => $variantId,
            'daily_menu_item_id' => null,
            'daily_menu_item_variant_id' => null,
            'product_name' => $product->name,
            'variant_name' => $variantName,
            'product_image' => $product->imagePublicUrl(),
            'unit_price' => $unitPrice,
            'quantity' => $item['quantity'],
            'subtotal' => $lineSubtotal,
            'stock_target' => $stockTarget,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<string, DailyMenuItem>  $dailyMenuItems
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function resolveDailyMenuItem($dailyMenuItems, array $item, int $index): array
    {
        /** @var DailyMenuItem $dailyItem */
        $dailyItem = $dailyMenuItems->get($item['product_id']);

        if ($dailyItem->has_variants) {
            if (empty($item['product_variant_id'])) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'Debes seleccionar una variante.',
                ]);
            }

            $variant = $dailyItem->variants->firstWhere('id', $item['product_variant_id']);

            if (! $variant) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'La variante seleccionada no está disponible.',
                ]);
            }

            if ($variant->stock !== null && $variant->stock < $item['quantity']) {
                throw ValidationException::withMessages([
                    "items.{$index}.quantity" => "Stock insuficiente para {$dailyItem->name} ({$variant->name}).",
                ]);
            }

            $unitPrice = (float) $variant->price;
            $variantName = $variant->name;
            $variantId = $variant->id;
            $stockTarget = $variant;
        } else {
            if (! empty($item['product_variant_id'])) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'Este platillo no tiene variantes.',
                ]);
            }

            if ($dailyItem->stock !== null && $dailyItem->stock < $item['quantity']) {
                throw ValidationException::withMessages([
                    "items.{$index}.quantity" => "Stock insuficiente para {$dailyItem->name}.",
                ]);
            }

            if ($dailyItem->stock === 0) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => "{$dailyItem->name} está agotado.",
                ]);
            }

            $unitPrice = (float) $dailyItem->price;
            $variantName = null;
            $variantId = null;
            $stockTarget = $dailyItem;
        }

        $lineSubtotal = round($unitPrice * $item['quantity'], 2);

        return [
            'product_id' => null,
            'product_variant_id' => null,
            'daily_menu_item_id' => $dailyItem->id,
            'daily_menu_item_variant_id' => $variantId,
            'product_name' => $dailyItem->name,
            'variant_name' => $variantName,
            'product_image' => $dailyItem->imagePublicUrl(),
            'unit_price' => $unitPrice,
            'quantity' => $item['quantity'],
            'subtotal' => $lineSubtotal,
            'stock_target' => $stockTarget,
        ];
    }

    public function confirmation(Order $order): Response
    {
        $order->load(['items', 'organization']);
        OrderItemImageResolver::resolve($order->items);

        return Inertia::render('Public/OrderConfirmation', [
            'order' => $order->only([
                'id',
                'customer_name',
                'customer_phone',
                'customer_notes',
                'type',
                'delivery_address',
                'delivery_city',
                'latitude',
                'longitude',
                'delivery_maps_url',
                'status',
                'payment_method',
                'subtotal',
                'delivery_fee',
                'total',
            ]) + [
                'items' => $order->items->map(fn ($item) => $item->only([
                    'id',
                    'product_id',
                    'product_variant_id',
                    'product_name',
                    'variant_name',
                    'product_image',
                    'unit_price',
                    'quantity',
                    'subtotal',
                ])),
            ],
            'organization' => array_merge($order->organization->only([
                'id',
                'name',
                'slug',
                'phone',
                'address',
                'city',
            ]), [
                'logo' => $order->organization->logoPublicUrl(),
            ]),
        ]);
    }
}
