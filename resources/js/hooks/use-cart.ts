import { useCallback, useMemo, useState } from 'react';

import { type CartItem, type Product, type ProductVariant } from '@/types';

function matchesItem(item: CartItem, productId: string, variantId: string | null): boolean {
    return item.productId === productId && item.variantId === variantId;
}

export function useCart(organizationId: string) {
    const [items, setItems] = useState<CartItem[]>([]);

    const addItem = useCallback((product: Product, variant?: ProductVariant) => {
        if (product.has_variants) {
            if (!variant || variant.stock === 0) {
                return;
            }
        } else if (product.stock === 0) {
            return;
        }

        const variantId = variant?.id ?? null;
        const variantName = variant?.name ?? null;
        const price = Number(variant?.price ?? product.price);

        setItems((current) => {
            const existing = current.find((item) => matchesItem(item, product.id, variantId));

            if (existing) {
                return current.map((item) =>
                    matchesItem(item, product.id, variantId) ? { ...item, quantity: item.quantity + 1 } : item,
                );
            }

            return [
                ...current,
                {
                    productId: product.id,
                    productName: product.name,
                    variantId,
                    variantName,
                    price,
                    quantity: 1,
                },
            ];
        });
    }, []);

    const removeItem = useCallback((productId: string, variantId: string | null) => {
        setItems((current) => current.filter((item) => !matchesItem(item, productId, variantId)));
    }, []);

    const incrementItem = useCallback((productId: string, variantId: string | null) => {
        setItems((current) =>
            current.map((item) =>
                matchesItem(item, productId, variantId) ? { ...item, quantity: item.quantity + 1 } : item,
            ),
        );
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
