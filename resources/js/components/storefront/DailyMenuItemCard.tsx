import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { stockLimitMessage } from '@/lib/cart-stock';
import { dailyMenuItemToCartable, dailyMenuVariantToCartable } from '@/lib/cartable-product';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { type CartableProduct, type CartableVariant, type DailyMenuItem } from '@/types';

interface DailyMenuItemCardProps {
    item: DailyMenuItem;
    getQuantityInCart: (productId: string, variantId: string | null, source?: 'menu' | 'daily') => number;
    onAdd: (product: CartableProduct, variant?: CartableVariant) => boolean;
}

function isInStock(stock: number | null): boolean {
    return stock === null || stock > 0;
}

function firstAvailableVariantId(item: DailyMenuItem): string | null {
    const available = item.variants.find((variant) => isInStock(variant.stock));

    return available?.id ?? item.variants[0]?.id ?? null;
}

export function DailyMenuItemCard({ item, getQuantityInCart, onAdd }: DailyMenuItemCardProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() =>
        item.has_variants ? firstAvailableVariantId(item) : null,
    );
    const [limitMessage, setLimitMessage] = useState<string | null>(null);

    const selectedVariant = item.variants.find((variant) => variant.id === selectedVariantId);
    const quantityInCart = getQuantityInCart(item.id, item.has_variants ? selectedVariantId : null, 'daily');
    const hasAvailableVariants = item.variants.some((variant) => isInStock(variant.stock));
    const isSoldOut = item.has_variants ? !hasAvailableVariants : item.stock === 0;

    const activeStock = item.has_variants
        ? selectedVariant
            ? selectedVariant.stock
            : 0
        : item.stock;
    const atStockLimit = activeStock !== null && quantityInCart >= activeStock;

    const displayPrice = item.has_variants && selectedVariant ? selectedVariant.price : item.price;

    const canAdd = useMemo(() => {
        if (item.has_variants) {
            return selectedVariant !== undefined && isInStock(selectedVariant.stock) && !atStockLimit;
        }

        return isInStock(item.stock) && !atStockLimit;
    }, [atStockLimit, item.has_variants, item.stock, selectedVariant]);

    const variantSoldOutMap = useMemo(
        () => new Map(item.variants.map((variant) => [variant.id, variant.stock === 0])),
        [item.variants],
    );

    const handleAdd = () => {
        if (!canAdd) {
            setLimitMessage(stockLimitMessage(activeStock, quantityInCart));
            return;
        }

        const cartProduct = dailyMenuItemToCartable(item);
        const added =
            item.has_variants && selectedVariant
                ? onAdd(cartProduct, dailyMenuVariantToCartable(selectedVariant))
                : onAdd(cartProduct);

        if (!added) {
            setLimitMessage(stockLimitMessage(activeStock, quantityInCart));
            return;
        }

        setLimitMessage(null);
    };

    return (
        <Card className={cn('flex h-full flex-col overflow-hidden py-0', isSoldOut && 'opacity-90')}>
            <div className="relative aspect-[4/3] w-full shrink-0">
                {item.image ? (
                    <img src={item.image} alt={item.name} className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/20">
                        <span className="text-5xl font-semibold text-orange-700/70 dark:text-orange-300/70">
                            {item.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                {isSoldOut && (
                    <Badge variant="secondary" className="absolute top-3 right-3 shadow-sm">
                        Agotado
                    </Badge>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-base leading-snug font-semibold">{item.name}</h3>
                    {item.description && (
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                            {item.description}
                        </p>
                    )}
                    {!item.has_variants && (
                        <p className="pt-1 text-lg font-semibold tabular-nums">{formatCurrency(item.price)}</p>
                    )}
                </div>

                {item.has_variants && item.variants.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                            {item.variants.map((variant) => {
                                const variantSoldOut = variantSoldOutMap.get(variant.id) ?? false;

                                return (
                                    <Button
                                        key={variant.id}
                                        type="button"
                                        variant={selectedVariantId === variant.id ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={variantSoldOut}
                                        className={cn(
                                            'h-auto rounded-full px-2.5 py-1.5 text-xs',
                                            variantSoldOut && 'opacity-60',
                                        )}
                                        onClick={() => {
                                            setSelectedVariantId(variant.id);
                                            setLimitMessage(null);
                                        }}
                                    >
                                        <span>{variant.name}</span>
                                        <span className="ml-1.5 font-semibold tabular-nums">
                                            {formatCurrency(variant.price)}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                        {selectedVariant && (
                            <p className="text-base font-semibold tabular-nums">{formatCurrency(displayPrice)}</p>
                        )}
                    </div>
                )}

                <div className="mt-auto space-y-2">
                    {limitMessage && <p className="text-destructive text-xs">{limitMessage}</p>}
                    {quantityInCart > 0 && activeStock !== null && (
                        <p className="text-muted-foreground text-xs">
                            En tu pedido: {quantityInCart}/{activeStock}
                        </p>
                    )}
                    {isSoldOut ? (
                        <div className="text-muted-foreground flex h-10 w-full items-center justify-center rounded-xl border border-dashed text-sm font-medium">
                            Agotado
                        </div>
                    ) : (
                        <Button
                            type="button"
                            className="w-full rounded-xl bg-orange-600 hover:bg-orange-700"
                            disabled={!canAdd}
                            onClick={handleAdd}
                        >
                            <Plus className="size-4" />
                            {atStockLimit ? 'Máximo en carrito' : 'Agregar'}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
