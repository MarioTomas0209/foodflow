<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Onboarding/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $slug = $request->input('slug') ?: $this->generateSlug($request->input('name', ''));
        $request->merge(['slug' => $slug]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:organizations,slug', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
            'phone' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($validated, $user) {
            $organization = Organization::create([
                'owner_id' => $user->id,
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'phone' => $validated['phone'] ?? null,
                'description' => $validated['description'] ?? null,
                'status' => 'active',
            ]);

            $organization->users()->attach($user->id, [
                'role' => 'owner',
            ]);

            $user->update(['current_organization_id' => $organization->id]);
        });

        return redirect()->route('dashboard.index');
    }

    private function generateSlug(string $value): string
    {
        $slug = Str::ascii($value);
        $slug = strtolower($slug);
        $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug) ?? '';
        $slug = preg_replace('/[\s-]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug;
    }
}
