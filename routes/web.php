<?php

use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Dashboard\MenuController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Public\OrderController;
use App\Http\Controllers\Public\StorefrontController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$slugPattern = '^[a-z0-9]+(?:-[a-z0-9]+)*$';

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

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
    Route::post('/menu/products', [MenuController::class, 'storeProduct'])->name('menu.products.store');
    Route::put('/menu/products/{product}', [MenuController::class, 'updateProduct'])->name('menu.products.update');
});

Route::get('/orders/{order}/confirmation', [OrderController::class, 'confirmation'])->name('storefront.order.confirmation');
Route::get('/{slug}/checkout', [OrderController::class, 'checkout'])->name('storefront.checkout')->where('slug', $slugPattern);
Route::post('/{slug}/orders', [OrderController::class, 'store'])->name('storefront.orders.store')->where('slug', $slugPattern);

Route::get('/{slug}', [StorefrontController::class, 'show'])
    ->name('storefront.show')
    ->where('slug', $slugPattern);
