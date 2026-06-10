<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $organization = auth()->user()->currentOrganization;

        return Inertia::render('Dashboard/Index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'logo' => $organization->logo,
            ],
            'stats' => [
                'orders_today' => 0,
                'orders_pending' => 0,
                'revenue_today' => 0,
            ],
            'isFirstDay' => $organization->created_at->isToday(),
        ]);
    }
}
