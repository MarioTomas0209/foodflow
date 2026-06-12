<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyMenuItemVariant extends Model
{
    use HasUlids;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'daily_menu_item_id',
        'name',
        'price',
        'stock',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'stock' => 'integer',
        ];
    }

    public function dailyMenuItem(): BelongsTo
    {
        return $this->belongsTo(DailyMenuItem::class);
    }

    public function isAvailable(): bool
    {
        return $this->stock === null || $this->stock > 0;
    }
}
