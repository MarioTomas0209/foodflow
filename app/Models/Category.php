<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasUlids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'sort_order',
        'is_active',
        'available_from',
        'available_until',
        'available_days',
        'schedule_type',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'available_days' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function isAvailableNow(): bool
    {
        if ($this->available_from === null && $this->available_until === null) {
            return true;
        }

        $now = now();
        $currentTime = $now->format('H:i:s');
        $currentDay = (int) $now->dayOfWeek;

        if ($this->available_days !== null) {
            if (! in_array($currentDay, $this->available_days)) {
                return false;
            }
        }

        $from = $this->available_from;
        $until = $this->available_until;

        if ($from && $currentTime < $from) {
            return false;
        }

        if ($until && $currentTime > $until) {
            return false;
        }

        return true;
    }

    public function canOrderNow(): bool
    {
        if (
            $this->available_from === null
            && $this->available_until === null
            && ($this->available_days === null || $this->available_days === [])
        ) {
            return true;
        }

        $now = now();
        $currentTime = $now->format('H:i:s');
        $currentDay = (int) $now->dayOfWeek;

        if ($this->available_days !== null && $this->available_days !== []) {
            if (! in_array($currentDay, $this->available_days, true)) {
                return false;
            }
        }

        if ($this->available_until !== null && $currentTime > $this->available_until) {
            return false;
        }

        return true;
    }
}
