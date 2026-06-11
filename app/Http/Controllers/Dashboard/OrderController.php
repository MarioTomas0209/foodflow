<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Order;
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
    private const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

    /**
     * @var list<string>
     */
    private const TYPES = ['pickup', 'delivery'];

    public function index(Request $request): Response
    {
        $organization = auth()->user()->currentOrganization;

        $status = $request->query('status', 'all');
        $type = $request->query('type', 'all');

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
            ->whereDate('created_at', today())
            ->latest();

        if ($status !== 'all' && $status !== null && $status !== '') {
            $query->where('status', $status);
        }

        if ($type !== 'all' && $type !== null && $type !== '') {
            $query->where('type', $type);
        }

        return Inertia::render('Dashboard/Orders/Index', [
            'orders' => $query->paginate(20)->withQueryString(),
            'filters' => [
                'status' => $status,
                'type' => $type,
            ],
        ]);
    }

    public function show(Order $order): Response
    {
        abort_unless($order->organization_id === auth()->user()->currentOrganization->id, 403);

        $order->load('items');

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
