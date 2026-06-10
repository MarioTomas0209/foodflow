<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class SetOrganizationContext
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check()) {
            return $next($request);
        }

        $user = auth()->user();

        if ($user->current_organization_id === null) {
            return redirect()->route('onboarding');
        }

        $organization = Organization::find($user->current_organization_id);

        if ($organization === null) {
            $user->update(['current_organization_id' => null]);

            return redirect()->route('onboarding');
        }

        Inertia::share('currentOrganization', [
            'id'   => $organization->id,
            'name' => $organization->name,
            'slug' => $organization->slug,
            'logo' => $organization->logo,
        ]);

        return $next($request);
    }
}
