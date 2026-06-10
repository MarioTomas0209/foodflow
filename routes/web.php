<?php

use App\Http\Controllers\Onboarding\OnboardingController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
    Route::get('/', fn () => inertia('Dashboard/Index'))->name('index');
});
