import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { stockLimitMessage } from '@/lib/cart-stock';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { type Product, type ProductVariant } from '@/types';

interface ProductCardProps {
    product: Product;
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

export function ProductCard({ product, getQuantityInCart, onAdd }: ProductCardProps) {
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

    const canAdd = useMemo(() => {
        if (product.has_variants) {
            return selectedVariant !== undefined && isInStock(selectedVariant.stock) && !atStockLimit;
        }

        return isInStock(product.stock) && !atStockLimit;
    }, [atStockLimit, product.has_variants, product.stock, selectedVariant]);

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
        <Card className={cn('overflow-hidden py-0', isSoldOut && 'opacity-90')}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold">{product.name}</h3>
                            {product.description && (
                                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{product.description}</p>
                            )}
                        </div>
                        {isSoldOut && (
                            <Badge variant="secondary" className="shrink-0">
                                Agotado
                            </Badge>
                        )}
                    </div>

                    {product.has_variants && product.variants.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                Elige una opción
                            </p>
                            <div className="flex flex-wrap gap-2">
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
                                                'h-auto rounded-full px-3 py-2',
                                                variantSoldOut && 'opacity-60',
                                            )}
                                            onClick={() => {
                                                setSelectedVariantId(variant.id);
                                                setLimitMessage(null);
                                            }}
                                        >
                                            <span>{variant.name}</span>
                                            <span className="ml-2 font-semibold tabular-nums">
                                                {formatCurrency(variant.price)}
                                            </span>
                                            {variantSoldOut && (
                                                <span className="text-muted-foreground ml-2 text-xs">Agotado</span>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-lg font-semibold tabular-nums">{formatCurrency(product.price)}</p>
                    )}
                </div>

                {isSoldOut ? (
                    <div className="text-muted-foreground flex h-11 w-full shrink-0 items-center justify-center rounded-xl border border-dashed text-sm font-medium sm:w-32">
                        Agotado
                    </div>
                ) : (
                    <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto">
                        {limitMessage && <p className="text-destructive text-xs">{limitMessage}</p>}
                        {quantityInCart > 0 && activeStock !== null && (
                            <p className="text-muted-foreground text-xs">
                                En tu pedido: {quantityInCart}/{activeStock}
                            </p>
                        )}
                        <Button
                            type="button"
                            size="lg"
                            className="w-full rounded-xl sm:w-auto sm:px-4"
                            disabled={!canAdd}
                            onClick={handleAdd}
                        >
                            <Plus className="size-5" />
                            {atStockLimit ? 'Máximo en carrito' : 'Agregar'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
