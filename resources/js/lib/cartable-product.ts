import {
    type CartableProduct,
    type CartableVariant,
    type DailyMenu,
    type DailyMenuItem,
    type Product,
    type ProductVariant,
} from '@/types';

export function productVariantToCartable(variant: ProductVariant): CartableVariant {
    return {
        id: variant.id,
        name: variant.name,
        price: variant.price,
        stock: variant.stock,
    };
}

export function dailyMenuVariantToCartable(variant: DailyMenuItem['variants'][number]): CartableVariant {
    return {
        id: variant.id,
        name: variant.name,
        price: variant.price,
        stock: variant.stock,
    };
}

export function productToCartable(product: Product): CartableProduct {
    return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        has_variants: product.has_variants,
        stock: product.stock,
        variants: product.variants.map(productVariantToCartable),
        source: 'menu',
    };
}

export function dailyMenuItemToCartable(item: DailyMenuItem): CartableProduct {
    return {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        has_variants: item.has_variants,
        stock: item.stock,
        variants: item.variants.map(dailyMenuVariantToCartable),
        source: 'daily',
    };
}

export function resolveCartableMaxStock(product: CartableProduct, variant?: CartableVariant): number | null {
    if (product.has_variants) {
        if (!variant) {
            return 0;
        }

        return variant.stock;
    }

    return product.stock;
}

export function findDailyMenuItem(dailyMenu: DailyMenu | null | undefined, itemId: string): DailyMenuItem | undefined {
    return dailyMenu?.items.find((item) => item.id === itemId);
}
