<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryZoneController extends Controller
{
    public function index(): Response
    {
        $zones = auth()->user()->currentOrganization
            ->deliveryZones()
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('Dashboard/DeliveryZones/Index', [
            'zones' => $zones,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->zoneRules());

        auth()->user()->currentOrganization->deliveryZones()->create([
            ...$validated,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()
            ->route('dashboard.delivery-zones.index')
            ->with('success', 'Zona de entrega creada correctamente.');
    }

    public function update(Request $request, DeliveryZone $zone): RedirectResponse
    {
        $this->authorizeZone($zone);

        $validated = $request->validate($this->zoneRules());

        $zone->update([
            ...$validated,
            'is_active' => $validated['is_active'] ?? $zone->is_active,
        ]);

        return redirect()
            ->route('dashboard.delivery-zones.index')
            ->with('success', 'Zona de entrega actualizada correctamente.');
    }

    public function destroy(DeliveryZone $zone): RedirectResponse
    {
        $this->authorizeZone($zone);

        $zone->delete();

        return redirect()
            ->route('dashboard.delivery-zones.index')
            ->with('success', 'Zona de entrega eliminada correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function zoneRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'fee' => ['required', 'numeric', 'min:0'],
            'center_lat' => ['required', 'numeric', 'between:-90,90'],
            'center_lng' => ['required', 'numeric', 'between:-180,180'],
            'radius_km' => ['required', 'numeric', 'min:0.1', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    private function authorizeZone(DeliveryZone $zone): void
    {
        abort_unless(
            $zone->organization_id === auth()->user()->currentOrganization->id,
            403,
        );
    }
}
