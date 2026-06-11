<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Organization;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        ]);
    }

    public function store(Request $request, string $slug): RedirectResponse
    {
        $organization = Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();

        $validated = $request->validate([
            'organization_id' => ['required', Rule::exists('organizations', 'id')],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:20'],
            'customer_notes' => ['nullable', 'string'],
            'type' => ['required', Rule::in(['pickup', 'delivery'])],
            'delivery_address' => ['required_if:type,delivery', 'nullable', 'string', 'max:255'],
            'delivery_city' => [
                Rule::requiredIf($request->input('type') === 'delivery'),
                'nullable',
                'string',
                Rule::in([self::DELIVERY_CITY]),
            ],
            'latitude' => [
                Rule::requiredIf($request->input('type') === 'delivery'),
                'nullable',
                'numeric',
                'between:-90,90',
            ],
            'longitude' => [
                Rule::requiredIf($request->input('type') === 'delivery'),
                'nullable',
                'numeric',
                'between:-180,180',
            ],
            'payment_method' => ['required', Rule::in(['cash', 'transfer'])],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')],
            'items.*.product_variant_id' => ['nullable', Rule::exists('product_variants', 'id')],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        abort_unless($validated['organization_id'] === $organization->id, 403);

        $productIds = collect($validated['items'])->pluck('product_id')->unique()->values();

        $products = Product::query()
            ->where('organization_id', $organization->id)
            ->where('is_active', true)
            ->whereIn('id', $productIds)
            ->with(['variants' => fn ($query) => $query->where('is_active', true)])
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->count()) {
            throw ValidationException::withMessages([
                'items' => 'Uno o más productos no están disponibles.',
            ]);
        }

        $resolvedItems = [];
        $subtotal = 0;

        foreach ($validated['items'] as $index => $item) {
            /** @var Product $product */
            $product = $products->get($item['product_id']);

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
            $subtotal += $lineSubtotal;

            $resolvedItems[] = [
                'product_id' => $product->id,
                'product_variant_id' => $variantId,
                'product_name' => $product->name,
                'variant_name' => $variantName,
                'unit_price' => $unitPrice,
                'quantity' => $item['quantity'],
                'subtotal' => $lineSubtotal,
                'stock_target' => $stockTarget,
            ];
        }

        $deliveryFee = 0;
        $total = round($subtotal + $deliveryFee, 2);

        $order = DB::transaction(function () use ($organization, $validated, $resolvedItems, $subtotal, $deliveryFee, $total) {
            $order = Order::create([
                'organization_id' => $organization->id,
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'],
                'customer_notes' => $validated['customer_notes'] ?? null,
                'type' => $validated['type'],
                'delivery_address' => $validated['type'] === 'delivery' ? $validated['delivery_address'] : null,
                'delivery_city' => $validated['type'] === 'delivery' ? $validated['delivery_city'] : null,
                'latitude' => $validated['type'] === 'delivery' ? $validated['latitude'] : null,
                'longitude' => $validated['type'] === 'delivery' ? $validated['longitude'] : null,
                'status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'total' => $total,
            ]);

            foreach ($resolvedItems as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'],
                    'product_name' => $item['product_name'],
                    'variant_name' => $item['variant_name'],
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

        return redirect()->route('storefront.order.confirmation', $order);
    }

    public function confirmation(Order $order): Response
    {
        $order->load(['items', 'organization']);

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
