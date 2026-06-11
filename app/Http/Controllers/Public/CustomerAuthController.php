<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CustomerAuthController extends Controller
{
    public function showLogin(string $slug): Response
    {
        return Inertia::render('Public/Auth/Login', [
            'organization' => $this->organizationPayload($slug),
        ]);
    }

    public function login(Request $request, string $slug): RedirectResponse
    {
        $this->resolveOrganization($slug);

        $credentials = $request->validate([
            'phone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::guard('customer')->attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'phone' => 'Teléfono o contraseña incorrectos.',
            ]);
        }

        $request->session()->regenerate();

        return redirect()
            ->intended(route('storefront.show', $slug))
            ->with('success', 'Sesión iniciada correctamente.');
    }

    public function showRegister(string $slug): Response
    {
        return Inertia::render('Public/Auth/Register', [
            'organization' => $this->organizationPayload($slug),
        ]);
    }

    public function register(Request $request, string $slug): RedirectResponse
    {
        $this->resolveOrganization($slug);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20', 'unique:customers,phone'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $customer = Customer::create($validated);

        Auth::guard('customer')->login($customer);

        $request->session()->regenerate();

        return redirect()
            ->intended(route('storefront.show', $slug))
            ->with('success', '¡Cuenta creada! Bienvenido.');
    }

    public function logout(Request $request, string $slug): RedirectResponse
    {
        $this->resolveOrganization($slug);

        Auth::guard('customer')->logout();

        return redirect()
            ->route('storefront.show', $slug)
            ->with('success', 'Sesión cerrada correctamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function organizationPayload(string $slug): array
    {
        $organization = $this->resolveOrganization($slug);

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
