<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Organization extends Model
{
    use HasUlids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'logo',
        'status',
        'settings',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function deliveryZones(): HasMany
    {
        return $this->hasMany(DeliveryZone::class)->orderBy('sort_order');
    }

    public function hours(): HasMany
    {
        return $this->hasMany(OrganizationHour::class)->orderBy('day_of_week');
    }

    public function dailyMenus(): HasMany
    {
        return $this->hasMany(DailyMenu::class);
    }

    public function todayMenu(): ?DailyMenu
    {
        return $this->dailyMenus()
            ->where('date', today())
            ->where('is_active', true)
            ->with([
                'items' => fn ($query) => $query
                    ->with('variants')
                    ->orderBy('sort_order'),
            ])
            ->first();
    }

    public function isOpenNow(): bool
    {
        $now = now();
        $dayOfWeek = (int) $now->dayOfWeek;
        $currentTime = $now->format('H:i:s');

        $hour = $this->hours()->where('day_of_week', $dayOfWeek)->first();

        if ($hour === null) {
            return true;
        }

        if ($hour->is_closed) {
            return false;
        }

        return $currentTime >= $hour->opens_at && $currentTime <= $hour->closes_at;
    }

    public function findDeliveryZoneFor(float $latitude, float $longitude): ?DeliveryZone
    {
        return $this->deliveryZones()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->first(fn (DeliveryZone $zone) => $zone->containsCoordinates($latitude, $longitude));
    }

    public function logoPublicUrl(): ?string
    {
        if ($this->logo === null) {
            return null;
        }

        if (str_starts_with($this->logo, 'http://') || str_starts_with($this->logo, 'https://')) {
            return $this->logo;
        }

        return Storage::disk('public')->url($this->logo);
    }
}
