<?php

use App\Http\Controllers\Dashboard\BusinessHoursController;
use App\Http\Controllers\Dashboard\DailyMenuController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Dashboard\DeliveryZoneController;
use App\Http\Controllers\Dashboard\MenuController;
use App\Http\Controllers\Dashboard\OrderController as DashboardOrderController;
use App\Http\Controllers\Dashboard\OrganizationController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Public\CustomerAuthController;
use App\Http\Controllers\Public\CustomerOrderController;
use App\Http\Controllers\Public\OrderController;
use App\Http\Controllers\Public\StorefrontController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$slugPattern = '^[a-z0-9]+(?:-[a-z0-9]+)*$';

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

Broadcast::routes(['middleware' => ['web', 'auth']]);

// Onboarding - requiere auth pero NO requiere organización
Route::middleware(['auth'])->group(function () {
    Route::get('/onboarding', [OnboardingController::class, 'create'])->name('onboarding');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');
});

// Dashboard del negocio - requiere auth Y organización activa
Route::middleware(['auth', 'org.context'])->prefix('dashboard')->name('dashboard.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('index');
    Route::get('/menu', [MenuController::class, 'index'])->name('menu.index');
    Route::post('/menu/categories', [MenuController::class, 'storeCategory'])->name('menu.categories.store');
    Route::put('/menu/categories/{category}', [MenuController::class, 'updateCategory'])->name('menu.categories.update');
    Route::post('/menu/products', [MenuController::class, 'storeProduct'])->name('menu.products.store');
    Route::post('/menu/products/{product}', [MenuController::class, 'updateProduct'])->name('menu.products.update');
    Route::get('/orders', [DashboardOrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/{order}', [DashboardOrderController::class, 'show'])->name('orders.show');
    Route::patch('/orders/{order}/status', [DashboardOrderController::class, 'updateStatus'])->name('orders.update-status');
    Route::get('/settings', [OrganizationController::class, 'edit'])->name('settings');
    Route::post('/settings', [OrganizationController::class, 'update'])->name('settings.update');
    Route::put('/hours', [BusinessHoursController::class, 'update'])->name('hours.update');
    Route::get('/delivery-zones', [DeliveryZoneController::class, 'index'])->name('delivery-zones.index');
    Route::post('/delivery-zones', [DeliveryZoneController::class, 'store'])->name('delivery-zones.store');
    Route::put('/delivery-zones/{zone}', [DeliveryZoneController::class, 'update'])->name('delivery-zones.update');
    Route::delete('/delivery-zones/{zone}', [DeliveryZoneController::class, 'destroy'])->name('delivery-zones.destroy');
    Route::resource('daily-menus', DailyMenuController::class)
        ->names('daily-menus')
        ->except(['show', 'update']);
    Route::post('daily-menus/{daily_menu}', [DailyMenuController::class, 'update'])
        ->name('daily-menus.update');
});

Route::get('/orders/{order}/confirmation', [OrderController::class, 'confirmation'])->name('storefront.order.confirmation');
Route::get('/{slug}/login', [CustomerAuthController::class, 'showLogin'])
    ->name('storefront.login')->where('slug', $slugPattern);
Route::post('/{slug}/login', [CustomerAuthController::class, 'login'])
    ->name('storefront.login.store')->where('slug', $slugPattern);
Route::get('/{slug}/register', [CustomerAuthController::class, 'showRegister'])
    ->name('storefront.register')->where('slug', $slugPattern);
Route::post('/{slug}/register', [CustomerAuthController::class, 'register'])
    ->name('storefront.register.store')->where('slug', $slugPattern);
Route::post('/{slug}/logout', [CustomerAuthController::class, 'logout'])
    ->name('storefront.logout')->where('slug', $slugPattern);
Route::middleware('auth.customer')->group(function () use ($slugPattern) {
    Route::get('/{slug}/orders', [CustomerOrderController::class, 'index'])
        ->name('storefront.orders.index')->where('slug', $slugPattern);
    Route::get('/{slug}/orders/{order}', [CustomerOrderController::class, 'show'])
        ->name('storefront.orders.show')->where('slug', $slugPattern);
});
Route::get('/{slug}/checkout', [OrderController::class, 'checkout'])->name('storefront.checkout')->where('slug', $slugPattern);
Route::get('/{slug}/maps/resolve', [OrderController::class, 'resolveMapsUrl'])->name('storefront.maps.resolve')->where('slug', $slugPattern);
Route::post('/{slug}/orders', [OrderController::class, 'store'])->name('storefront.orders.store')->where('slug', $slugPattern);

Route::get('/{slug}', [StorefrontController::class, 'show'])
    ->name('storefront.show')
    ->where('slug', $slugPattern);
