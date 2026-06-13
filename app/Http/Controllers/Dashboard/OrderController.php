<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\OrderItemImageResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * @var list<string>
     */
    private const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'en_route', 'delivered', 'cancelled'];

    /**
     * @var list<string>
     */
    private const TYPES = ['pickup', 'delivery'];

    public function index(Request $request): Response
    {
        $organization = auth()->user()->currentOrganization;

        $status = $request->query('status', 'all');
        $type = $request->query('type', 'all');
        $date = $request->query('date', today()->toDateString());
        $search = strtoupper(ltrim(trim((string) $request->query('search', '')), '#'));

        $request->validate([
            'date' => ['nullable', 'date', 'before_or_equal:today'],
            'search' => ['nullable', 'string', 'max:26'],
        ]);

        if ($status !== 'all') {
            $request->validate([
                'status' => ['nullable', Rule::in(self::STATUSES)],
            ]);
        }

        if ($type !== 'all') {
            $request->validate([
                'type' => ['nullable', Rule::in(self::TYPES)],
            ]);
        }

        $query = $organization->orders()
            ->with('items')
            ->latest();

        if ($search !== '') {
            $query->whereRaw('UPPER(id) LIKE ?', ['%'.$search.'%']);
        } else {
            $query->whereDate('created_at', $date);
        }

        if ($status !== 'all' && $status !== null && $status !== '') {
            $query->where('status', $status);
        }

        if ($type !== 'all' && $type !== null && $type !== '') {
            $query->where('type', $type);
        }

        $orders = $query->paginate(20)->withQueryString();

        $orders->getCollection()->each(function (Order $order) {
            OrderItemImageResolver::resolve($order->items);
        });

        return Inertia::render('Dashboard/Orders/Index', [
            'orders' => $orders,
            'filters' => [
                'status' => $status,
                'type' => $type,
                'date' => $date,
                'search' => $search,
            ],
        ]);
    }

    public function show(Order $order): Response
    {
        abort_unless($order->organization_id === auth()->user()->currentOrganization->id, 403);

        $order->load('items');
        OrderItemImageResolver::resolve($order->items);

        return Inertia::render('Dashboard/Orders/Show', [
            'order' => $order,
        ]);
    }

    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        abort_unless($order->organization_id === auth()->user()->currentOrganization->id, 403);

        $validated = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $order->update([
            'status' => $validated['status'],
        ]);

        return redirect()->back()->with('success', 'Estado del pedido actualizado.');
    }
}
