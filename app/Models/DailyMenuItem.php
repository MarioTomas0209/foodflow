<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class DailyMenuItem extends Model
{
    use HasUlids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_menu_id',
        'name',
        'description',
        'has_variants',
        'price',
        'stock',
        'image',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'has_variants' => 'boolean',
            'price' => 'decimal:2',
            'stock' => 'integer',
        ];
    }

    public function dailyMenu(): BelongsTo
    {
        return $this->belongsTo(DailyMenu::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(DailyMenuItemVariant::class)->orderBy('sort_order');
    }

    public function isAvailable(): bool
    {
        if ($this->has_variants) {
            if (! $this->relationLoaded('variants')) {
                $this->load('variants');
            }

            return $this->variants->contains(fn (DailyMenuItemVariant $variant) => $variant->isAvailable());
        }

        return $this->stock === null || $this->stock > 0;
    }

    public function imagePublicUrl(): ?string
    {
        if ($this->image === null) {
            return null;
        }

        if (str_starts_with($this->image, 'http://') || str_starts_with($this->image, 'https://')) {
            return $this->image;
        }

        return Storage::disk('public')->url($this->image);
    }
}
