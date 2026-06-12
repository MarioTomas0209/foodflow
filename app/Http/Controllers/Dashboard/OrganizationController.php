<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function edit(): Response
    {
        $organization = auth()->user()->currentOrganization;

        return Inertia::render('Dashboard/Organization/Edit', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'description' => $organization->description,
                'phone' => $organization->phone,
                'email' => $organization->email,
                'address' => $organization->address,
                'city' => $organization->city,
                'state' => $organization->state,
                'logo' => $organization->logoPublicUrl(),
            ],
            'hours' => $organization->hours()->orderBy('day_of_week')->get([
                'id', 'day_of_week', 'opens_at', 'closes_at', 'is_closed',
            ]),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $organization = auth()->user()->currentOrganization;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'logo' => ['nullable', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $payload = collect($validated)->except('logo')->all();

        if ($request->hasFile('logo')) {
            $this->deleteStoredLogo($organization->logo);

            $payload['logo'] = $request->file('logo')->store(
                "logos/{$organization->id}",
                'public',
            );
        }

        $organization->update($payload);

        return redirect()
            ->route('dashboard.settings')
            ->with('success', 'Perfil del negocio actualizado correctamente.');
    }

    private function deleteStoredLogo(?string $logo): void
    {
        if ($logo === null || str_starts_with($logo, 'http://') || str_starts_with($logo, 'https://')) {
            return;
        }

        Storage::disk('public')->delete($logo);
    }
}
