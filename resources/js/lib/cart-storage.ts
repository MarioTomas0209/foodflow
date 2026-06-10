import { type CartItem } from '@/types';

const CART_STORAGE_KEY = 'foodflow_checkout_cart';

export interface StoredCart {
    organizationId: string;
    organizationSlug: string;
    items: CartItem[];
}

export function saveCartForCheckout(cart: StoredCart): void {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function loadCartFromStorage(organizationId: string): StoredCart | null {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);

    if (!raw) {
        return null;
    }

    try {
        const cart = JSON.parse(raw) as StoredCart;

        if (cart.organizationId !== organizationId || cart.items.length === 0) {
            return null;
        }

        return cart;
    } catch {
        return null;
    }
}

export function clearCartStorage(): void {
    sessionStorage.removeItem(CART_STORAGE_KEY);
}
