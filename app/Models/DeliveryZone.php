<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryZone extends Model
{
    use HasUlids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'name',
        'fee',
        'center_lat',
        'center_lng',
        'radius_km',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'center_lat' => 'decimal:7',
            'center_lng' => 'decimal:7',
            'radius_km' => 'decimal:2',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function containsCoordinates(float $latitude, float $longitude): bool
    {
        $earthRadiusKm = 6371;

        $latFrom = deg2rad((float) $this->center_lat);
        $lngFrom = deg2rad((float) $this->center_lng);
        $latTo = deg2rad($latitude);
        $lngTo = deg2rad($longitude);

        $latDelta = $latTo - $latFrom;
        $lngDelta = $lngTo - $lngFrom;

        $angle = 2 * asin(sqrt(
            sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lngDelta / 2) ** 2
        ));

        $distanceKm = $angle * $earthRadiusKm;

        return $distanceKm <= (float) $this->radius_km;
    }
}
