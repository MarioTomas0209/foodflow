<?php

namespace App\Support;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Collection;

class OrderItemImageResolver
{
    /**
     * @param  Collection<int, OrderItem>  $items
     * @return Collection<int, OrderItem>
     */
    public static function resolve(Collection $items): Collection
    {
        $productIds = $items
            ->filter(fn (OrderItem $item) => empty($item->product_image) && $item->product_id !== null)
            ->pluck('product_id')
            ->unique()
            ->values();

        $products = $productIds->isEmpty()
            ? collect()
            : Product::query()->whereIn('id', $productIds)->get()->keyBy('id');

        $items->each(function (OrderItem $item) use ($products) {
            $image = $item->product_image;

            if (empty($image) && $item->product_id !== null && $products->has($item->product_id)) {
                $image = $products[$item->product_id]->imagePublicUrl();
            }

            $item->setAttribute('product_image', $image);
        });

        return $items;
    }
}
