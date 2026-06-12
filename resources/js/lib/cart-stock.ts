import { findDailyMenuItem } from '@/lib/cartable-product';
import { type CartItem, type Category, type DailyMenu } from '@/types';

export function resolveMaxStock(
    product: { has_variants: boolean; stock: number | null },
    variant?: { stock: number | null },
): number | null {
    if (product.has_variants) {
        if (!variant) {
            return 0;
        }

        return variant.stock;
    }

    return product.stock;
}

export function canIncreaseQuantity(quantity: number, maxStock: number | null): boolean {
    return maxStock === null || quantity < maxStock;
}

export function stockLimitMessage(maxStock: number | null, quantityInCart: number): string | null {
    if (maxStock === null) {
        return null;
    }

    if (quantityInCart >= maxStock) {
        return maxStock === 1 ? 'Solo hay 1 disponible' : `Solo hay ${maxStock} disponibles`;
    }

    return null;
}

function findProduct(categories: Category[], productId: string) {
    for (const category of categories) {
        const product = category.products.find((entry) => entry.id === productId);

        if (product) {
            return product;
        }
    }

    return undefined;
}

export function getStockForCartItem(
    categories: Category[],
    dailyMenu: DailyMenu | null | undefined,
    item: Pick<CartItem, 'productId' | 'variantId' | 'source'>,
): number | null | undefined {
    if (item.source === 'daily') {
        const dailyItem = findDailyMenuItem(dailyMenu, item.productId);

        if (!dailyItem) {
            return undefined;
        }

        if (dailyItem.has_variants) {
            const variant = dailyItem.variants.find((entry) => entry.id === item.variantId);

            if (!variant) {
                return undefined;
            }

            return variant.stock;
        }

        if (item.variantId) {
            return undefined;
        }

        return dailyItem.stock;
    }

    const product = findProduct(categories, item.productId);

    if (!product) {
        return undefined;
    }

    if (product.has_variants) {
        const variant = product.variants.find((entry) => entry.id === item.variantId);

        if (!variant) {
            return undefined;
        }

        return variant.stock;
    }

    if (item.variantId) {
        return undefined;
    }

    return product.stock;
}

export function validateCartAgainstCatalog(
    items: CartItem[],
    categories: Category[],
    dailyMenu?: DailyMenu | null,
): string | null {
    for (const item of items) {
        const stock = getStockForCartItem(categories, dailyMenu, item);
        const label = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;

        if (stock === undefined) {
            return `${label} ya no está disponible.`;
        }

        if (stock === 0) {
            return `${label} está agotado.`;
        }

        if (stock !== null && item.quantity > stock) {
            return stock === 1
                ? `Solo hay 1 ${item.productName} disponible. Ajusta tu carrito.`
                : `Solo hay ${stock} unidades de ${label}. Ajusta tu carrito.`;
        }
    }

    return null;
}
