<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyMenu extends Model
{
    use HasUlids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'date',
        'name',
        'available_from',
        'available_until',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DailyMenuItem::class)->orderBy('sort_order');
    }

    public function isAvailableNow(): bool
    {
        if ($this->available_from === null && $this->available_until === null) {
            return true;
        }

        $currentTime = now()->format('H:i:s');
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

    /** Whether customers can still place orders (allowed before opening; blocked after closing). */
    public function canOrderNow(): bool
    {
        if ($this->available_until === null) {
            return true;
        }

        return now()->format('H:i:s') <= $this->available_until;
    }
}
