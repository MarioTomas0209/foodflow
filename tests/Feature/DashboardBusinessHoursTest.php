<?php

use App\Models\Organization;
use App\Models\OrganizationHour;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createBusinessHoursUser(): array
{
    $user = User::factory()->create();
    $organization = Organization::create([
        'owner_id' => $user->id,
        'name' => 'Taquería Horarios',
        'slug' => 'taqueria-horarios-'.Str::lower(Str::random(6)),
        'status' => 'active',
    ]);

    $organization->users()->attach($user->id, ['role' => 'owner']);
    $user->update(['current_organization_id' => $organization->id]);

    foreach (range(0, 6) as $day) {
        OrganizationHour::create([
            'organization_id' => $organization->id,
            'day_of_week' => $day,
            'opens_at' => '08:00:00',
            'closes_at' => '20:00:00',
            'is_closed' => $day === 0,
        ]);
    }

    return [$user->fresh(), $organization->fresh()];
}

function defaultHoursPayload(array $overrides = []): array
{
    $hours = collect(range(0, 6))->map(fn (int $day) => array_merge([
        'day_of_week' => $day,
        'opens_at' => '08:00',
        'closes_at' => '20:00',
        'is_closed' => $day === 0,
    ], $overrides[$day] ?? []))->values()->all();

    return ['hours' => $hours];
}

test('settings page includes organization hours', function () {
    [$user, $organization] = createBusinessHoursUser();

    $this->actingAs($user)
        ->get(route('dashboard.settings'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Organization/Edit')
            ->has('hours', 7)
            ->where('hours.0.day_of_week', 0)
            ->where('hours.0.is_closed', true)
            ->where('hours.1.day_of_week', 1)
            ->where('hours.1.is_closed', false)
        );
});

test('authenticated users can update business hours', function () {
    [$user, $organization] = createBusinessHoursUser();

    $payload = defaultHoursPayload([
        1 => ['opens_at' => '09:00', 'closes_at' => '21:00'],
        2 => ['is_closed' => true],
    ]);

    $this->actingAs($user)
        ->put(route('dashboard.hours.update'), $payload)
        ->assertRedirect(route('dashboard.settings'))
        ->assertSessionHas('success');

    $this->assertDatabaseHas('organization_hours', [
        'organization_id' => $organization->id,
        'day_of_week' => 1,
        'opens_at' => '09:00:00',
        'closes_at' => '21:00:00',
        'is_closed' => false,
    ]);

    $this->assertDatabaseHas('organization_hours', [
        'organization_id' => $organization->id,
        'day_of_week' => 2,
        'is_closed' => true,
    ]);
});

test('business hours update rejects closing time before opening time', function () {
    [$user] = createBusinessHoursUser();

    $payload = defaultHoursPayload([
        3 => ['opens_at' => '18:00', 'closes_at' => '10:00'],
    ]);

    $this->actingAs($user)
        ->put(route('dashboard.hours.update'), $payload)
        ->assertSessionHasErrors('hours.3.closes_at');
});

test('business hours update requires times when day is open', function () {
    [$user] = createBusinessHoursUser();

    $payload = defaultHoursPayload([
        4 => ['opens_at' => null, 'closes_at' => null, 'is_closed' => false],
    ]);

    $this->actingAs($user)
        ->put(route('dashboard.hours.update'), $payload)
        ->assertSessionHasErrors('hours.4.opens_at');
});

test('business hours update accepts closed days without times', function () {
    [$user, $organization] = createBusinessHoursUser();

    $hours = collect(range(0, 6))->map(fn (int $day) => [
        'day_of_week' => $day,
        'opens_at' => null,
        'closes_at' => null,
        'is_closed' => true,
    ])->values()->all();

    $this->actingAs($user)
        ->put(route('dashboard.hours.update'), ['hours' => $hours])
        ->assertRedirect(route('dashboard.settings'))
        ->assertSessionHas('success');

    expect(OrganizationHour::query()
        ->where('organization_id', $organization->id)
        ->where('is_closed', true)
        ->count())->toBe(7);
});

test('guests cannot update business hours', function () {
    $this->put(route('dashboard.hours.update'), defaultHoursPayload())
        ->assertRedirect(route('login'));
});
