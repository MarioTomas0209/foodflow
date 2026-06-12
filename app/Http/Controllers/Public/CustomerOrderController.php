<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Support\OrderItemImageResolver;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CustomerOrderController extends Controller
{
    public function index(string $slug): Response
    {
        $organization = $this->resolveOrganization($slug);
        $customer = Auth::guard('customer')->user();

        $orders = $customer->orders()
            ->where('organization_id', $organization->id)
            ->with(['items', 'organization'])
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $orders->getCollection()->each(function ($order) {
            OrderItemImageResolver::resolve($order->items);
        });

        return Inertia::render('Public/Orders/Index', [
            'organization' => $this->organizationPayload($organization),
            'orders' => $orders,
        ]);
    }

    public function show(string $slug, string $order): Response
    {
        $organization = $this->resolveOrganization($slug);
        $customer = Auth::guard('customer')->user();

        $order = $customer->orders()
            ->where('organization_id', $organization->id)
            ->with(['items', 'organization'])
            ->findOrFail($order);

        OrderItemImageResolver::resolve($order->items);

        return Inertia::render('Public/Orders/Show', [
            'organization' => $this->organizationPayload($organization),
            'order' => $order,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function organizationPayload(Organization $organization): array
    {
        return array_merge($organization->only([
            'id',
            'name',
            'slug',
            'description',
            'phone',
            'address',
            'city',
        ]), [
            'logo' => $organization->logoPublicUrl(),
        ]);
    }

    private function resolveOrganization(string $slug): Organization
    {
        return Organization::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->firstOrFail();
    }
}
