import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { Button } from '@/components/ui/button';
import { stockLimitMessage } from '@/lib/cart-stock';
import { dailyMenuItemToCartable, dailyMenuVariantToCartable } from '@/lib/cartable-product';
import { formatCurrency } from '@/lib/format-currency';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type CartableProduct, type CartableVariant, type DailyMenuItem } from '@/types';

interface DailyMenuItemCardProps {
    item: DailyMenuItem;
    menuAvailable?: boolean;
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

export function DailyMenuItemCard({ item, menuAvailable = true, getQuantityInCart, onAdd }: DailyMenuItemCardProps) {
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
        if (!menuAvailable) {
            return false;
        }

        if (item.has_variants) {
            return selectedVariant !== undefined && isInStock(selectedVariant.stock) && !atStockLimit;
        }

        return isInStock(item.stock) && !atStockLimit;
    }, [atStockLimit, item.has_variants, item.stock, menuAvailable, selectedVariant]);

    const variantSoldOutMap = useMemo(
        () => new Map(item.variants.map((variant) => [variant.id, variant.stock === 0])),
        [item.variants],
    );

    const handleAdd = () => {
        if (!menuAvailable) {
            setLimitMessage('El menú del día ya no acepta pedidos.');
            return;
        }

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
        <article
            className={cn(
                'border-border bg-card flex gap-3 rounded-2xl border p-3 shadow-sm',
                isSoldOut && 'opacity-75',
            )}
        >
            <ProductThumbnail image={item.image} name={item.name} className="size-20 rounded-xl" />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                        <h3 className="text-base leading-snug font-bold">{item.name}</h3>
                        <span className="bg-orange-100 text-orange-700 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                            Menú del día
                        </span>
                    </div>
                    <p className={cn('shrink-0 text-base font-bold tabular-nums', storefrontAccent.text)}>
                        {formatCurrency(displayPrice)}
                    </p>
                </div>

                {item.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                        {item.description}
                    </p>
                )}

                {item.has_variants && item.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {item.variants.map((variant) => {
                            const variantSoldOut = variantSoldOutMap.get(variant.id) ?? false;

                            return (
                                <button
                                    key={variant.id}
                                    type="button"
                                    disabled={variantSoldOut}
                                    onClick={() => {
                                        setSelectedVariantId(variant.id);
                                        setLimitMessage(null);
                                    }}
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                        selectedVariantId === variant.id
                                            ? cn(storefrontAccent.pill, 'border-transparent')
                                            : 'border-border bg-background text-foreground hover:bg-muted',
                                        variantSoldOut && 'cursor-not-allowed opacity-50',
                                    )}
                                >
                                    {variant.name}
                                </button>
                            );
                        })}
                    </div>
                )}

                {limitMessage && <p className="text-destructive text-xs">{limitMessage}</p>}
                {quantityInCart > 0 && activeStock !== null && (
                    <p className="text-muted-foreground text-xs">
                        En tu pedido: {quantityInCart}/{activeStock}
                    </p>
                )}

                <div className="mt-auto flex justify-end">
                    {!menuAvailable ? (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 uppercase">
                            Fuera de horario
                        </span>
                    ) : isSoldOut ? (
                        <span className="text-muted-foreground rounded-full border border-dashed px-4 py-2 text-xs font-semibold uppercase">
                            Agotado
                        </span>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            className={cn('h-9 rounded-full px-4 text-xs font-bold tracking-wide uppercase', storefrontAccent.button)}
                            disabled={!canAdd}
                            onClick={handleAdd}
                        >
                            <Plus className="size-3.5" />
                            {atStockLimit ? 'Máximo' : 'Agregar'}
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}
