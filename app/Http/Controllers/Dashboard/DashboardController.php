<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $today = today();
        $organization = auth()->user()->currentOrganization;
        $ordersToday = $organization->orders()->whereDate('created_at', $today);

        return Inertia::render('Dashboard/Index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'logo' => $organization->logoPublicUrl(),
            ],
            'stats' => [
                'orders_today' => (clone $ordersToday)->count(),
                'orders_pending' => (clone $ordersToday)->where('status', 'pending')->count(),
                'revenue_today' => (clone $ordersToday)
                    ->whereIn('status', ['confirmed', 'preparing', 'ready', 'delivered'])
                    ->sum('total'),
            ],
            'isFirstDay' => $organization->created_at->isToday(),
        ]);
    }
}
