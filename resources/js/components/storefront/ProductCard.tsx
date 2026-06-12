import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { stockLimitMessage } from '@/lib/cart-stock';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { type Product, type ProductVariant } from '@/types';

interface ProductCardProps {
    product: Product;
    categoryAvailable?: boolean;
    getQuantityInCart: (productId: string, variantId: string | null) => number;
    onAdd: (product: Product, variant?: ProductVariant) => boolean;
}

function isInStock(stock: number | null): boolean {
    return stock === null || stock > 0;
}

function firstAvailableVariantId(product: Product): string | null {
    const available = product.variants.find((variant) => isInStock(variant.stock));

    return available?.id ?? product.variants[0]?.id ?? null;
}

export function ProductCard({ product, categoryAvailable = true, getQuantityInCart, onAdd }: ProductCardProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() =>
        product.has_variants ? firstAvailableVariantId(product) : null,
    );
    const [limitMessage, setLimitMessage] = useState<string | null>(null);

    const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
    const quantityInCart = getQuantityInCart(product.id, product.has_variants ? selectedVariantId : null);
    const hasAvailableVariants = product.variants.some((variant) => isInStock(variant.stock));
    const isSoldOut = product.has_variants ? !hasAvailableVariants : product.stock === 0;

    const activeStock = product.has_variants
        ? selectedVariant
            ? selectedVariant.stock
            : 0
        : product.stock;
    const atStockLimit = activeStock !== null && quantityInCart >= activeStock;

    const displayPrice = product.has_variants && selectedVariant ? selectedVariant.price : product.price;

    const canAdd = useMemo(() => {
        if (!categoryAvailable) {
            return false;
        }

        if (product.has_variants) {
            return selectedVariant !== undefined && isInStock(selectedVariant.stock) && !atStockLimit;
        }

        return isInStock(product.stock) && !atStockLimit;
    }, [atStockLimit, categoryAvailable, product.has_variants, product.stock, selectedVariant]);

    const handleAdd = () => {
        if (!canAdd) {
            setLimitMessage(stockLimitMessage(activeStock, quantityInCart));
            return;
        }

        const added =
            product.has_variants && selectedVariant ? onAdd(product, selectedVariant) : onAdd(product);

        if (!added) {
            setLimitMessage(stockLimitMessage(activeStock, quantityInCart));
            return;
        }

        setLimitMessage(null);
    };

    return (
        <Card className={cn('flex h-full flex-col overflow-hidden py-0', isSoldOut && 'opacity-90')}>
            <div className="relative aspect-[4/3] w-full shrink-0">
                {product.image ? (
                    <img src={product.image} alt={product.name} className="size-full object-cover" />
                ) : (
                    <div className="bg-muted flex size-full items-center justify-center">
                        <span className="text-muted-foreground text-5xl font-semibold">
                            {product.name.charAt(0).toUpperCase()}
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
                    <h3 className="text-base leading-snug font-semibold">{product.name}</h3>
                    {product.description && (
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                            {product.description}
                        </p>
                    )}
                    {!product.has_variants && (
                        <p className="pt-1 text-lg font-semibold tabular-nums">{formatCurrency(product.price)}</p>
                    )}
                </div>

                {product.has_variants && product.variants.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                            {product.variants.map((variant) => {
                                const variantSoldOut = variant.stock === 0;

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
                            className="w-full rounded-xl"
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
