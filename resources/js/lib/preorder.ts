import { type CartItem, type DailyMenu } from '@/types';

export interface PreorderWindow {
    available_from: string;
    available_until: string;
}

export interface CartContextCategory {
    id: string;
    available_from: string | null;
    available_until: string | null;
    schedule_type: 'informative' | 'restricted';
    is_available_now: boolean;
}

export interface CartContext {
    categories: CartContextCategory[];
    product_categories: Record<string, string | null>;
}

function toTimeInput(value: string): string {
    return value.slice(0, 5);
}

function compareTime(a: string, b: string): number {
    return a.localeCompare(b);
}

export function getPreorderWindow(
    cartItems: CartItem[],
    cartContext: CartContext,
    _dailyMenu: DailyMenu | null = null,
): PreorderWindow | null {
    const menuItems = cartItems.filter((item) => (item.source ?? 'menu') === 'menu');

    if (menuItems.length === 0) {
        return null;
    }

    const categoryMap = new Map(cartContext.categories.map((category) => [category.id, category]));
    const affectedCategoryIds = new Set<string>();

    for (const item of menuItems) {
        const categoryId = cartContext.product_categories[item.productId];

        if (!categoryId) {
            continue;
        }

        const category = categoryMap.get(categoryId);

        if (!category) {
            continue;
        }

        if (category.schedule_type !== 'informative' || category.is_available_now) {
            continue;
        }

        if (!category.available_from || !category.available_until) {
            continue;
        }

        affectedCategoryIds.add(categoryId);
    }

    if (affectedCategoryIds.size === 0) {
        return null;
    }

    let earliestFrom = '23:59';
    let latestUntil = '00:00';

    for (const categoryId of affectedCategoryIds) {
        const category = categoryMap.get(categoryId)!;
        const from = toTimeInput(category.available_from);
        const until = toTimeInput(category.available_until);

        if (compareTime(from, earliestFrom) < 0) {
            earliestFrom = from;
        }

        if (compareTime(until, latestUntil) > 0) {
            latestUntil = until;
        }
    }

    return {
        available_from: earliestFrom,
        available_until: latestUntil,
    };
}
