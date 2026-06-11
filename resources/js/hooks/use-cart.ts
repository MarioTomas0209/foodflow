import { useCallback, useMemo, useState } from 'react';

import { canIncreaseQuantity, resolveMaxStock } from '@/lib/cart-stock';
import { type CartItem, type Product, type ProductVariant } from '@/types';

function matchesItem(item: CartItem, productId: string, variantId: string | null): boolean {
    return item.productId === productId && item.variantId === variantId;
}

export function useCart(organizationId: string) {
    const [items, setItems] = useState<CartItem[]>([]);

    const getQuantity = useCallback(
        (productId: string, variantId: string | null) => {
            return items.find((item) => matchesItem(item, productId, variantId))?.quantity ?? 0;
        },
        [items],
    );

    const addItem = useCallback((product: Product, variant?: ProductVariant): boolean => {
        const maxStock = resolveMaxStock(product, variant);

        if (product.has_variants && !variant) {
            return false;
        }

        if (maxStock === 0) {
            return false;
        }

        const variantId = variant?.id ?? null;
        const variantName = variant?.name ?? null;
        const price = Number(variant?.price ?? product.price);

        let added = false;

        setItems((current) => {
            const existing = current.find((item) => matchesItem(item, product.id, variantId));

            if (existing) {
                if (!canIncreaseQuantity(existing.quantity, existing.maxStock)) {
                    return current;
                }

                added = true;

                return current.map((item) =>
                    matchesItem(item, product.id, variantId) ? { ...item, quantity: item.quantity + 1 } : item,
                );
            }

            if (!canIncreaseQuantity(0, maxStock)) {
                return current;
            }

            added = true;

            return [
                ...current,
                {
                    productId: product.id,
                    productName: product.name,
                    variantId,
                    variantName,
                    price,
                    quantity: 1,
                    maxStock,
                },
            ];
        });

        return added;
    }, []);

    const removeItem = useCallback((productId: string, variantId: string | null) => {
        setItems((current) => current.filter((item) => !matchesItem(item, productId, variantId)));
    }, []);

    const incrementItem = useCallback((productId: string, variantId: string | null): boolean => {
        let incremented = false;

        setItems((current) =>
            current.map((item) => {
                if (!matchesItem(item, productId, variantId)) {
                    return item;
                }

                if (!canIncreaseQuantity(item.quantity, item.maxStock)) {
                    return item;
                }

                incremented = true;

                return { ...item, quantity: item.quantity + 1 };
            }),
        );

        return incremented;
    }, []);

    const decrementItem = useCallback((productId: string, variantId: string | null) => {
        setItems((current) =>
            current
                .map((item) =>
                    matchesItem(item, productId, variantId) ? { ...item, quantity: item.quantity - 1 } : item,
                )
                .filter((item) => item.quantity > 0),
        );
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

    const isEmpty = items.length === 0;

    return {
        organizationId,
        items,
        getQuantity,
        addItem,
        removeItem,
        incrementItem,
        decrementItem,
        clearCart,
        totalItems,
        subtotal,
        isEmpty,
    };
}
