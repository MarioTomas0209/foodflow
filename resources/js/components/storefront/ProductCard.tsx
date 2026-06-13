import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { Button } from '@/components/ui/button';
import { stockLimitMessage } from '@/lib/cart-stock';
import { productToCartable, productVariantToCartable } from '@/lib/cartable-product';
import { formatCurrency } from '@/lib/format-currency';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type CartableProduct, type CartableVariant, type Product } from '@/types';

interface ProductCardProps {
    product: Product;
    categoryAvailable?: boolean;
    getQuantityInCart: (productId: string, variantId: string | null, source?: 'menu' | 'daily') => number;
    onAdd: (product: CartableProduct, variant?: CartableVariant) => boolean;
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
    const quantityInCart = getQuantityInCart(product.id, product.has_variants ? selectedVariantId : null, 'menu');
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
        if (!categoryAvailable) {
            setLimitMessage('Esta categoría ya no acepta pedidos.');
            return;
        }

        if (!canAdd) {
            setLimitMessage(stockLimitMessage(activeStock, quantityInCart));
            return;
        }

        const cartProduct = productToCartable(product);
        const added =
            product.has_variants && selectedVariant
                ? onAdd(cartProduct, productVariantToCartable(selectedVariant))
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
            <ProductThumbnail image={product.image} name={product.name} className="size-20 rounded-xl" />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 text-base leading-snug font-bold">{product.name}</h3>
                    <p className={cn('shrink-0 text-base font-bold tabular-nums', storefrontAccent.text)}>
                        {formatCurrency(displayPrice)}
                    </p>
                </div>

                {product.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                        {product.description}
                    </p>
                )}

                {product.has_variants && product.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {product.variants.map((variant) => {
                            const variantSoldOut = variant.stock === 0;

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
                    {!categoryAvailable && !isSoldOut ? (
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
