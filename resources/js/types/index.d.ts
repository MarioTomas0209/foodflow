import type { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
}

export interface PublicOrganization {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    phone: string | null;
    logo: string | null;
    address: string | null;
    city: string | null;
}

export interface ProductVariant {
    id: string;
    name: string;
    price: string;
    is_active: boolean;
    sort_order: number;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: string;
    has_variants: boolean;
    image: string | null;
    is_active: boolean;
    sort_order: number;
    category_id: string | null;
    variants: ProductVariant[];
}

export interface Category {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    products: Product[];
}

export interface CartItem {
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string | null;
    price: number;
    quantity: number;
}

export interface Cart {
    organizationId: string;
    items: CartItem[];
}

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface FlashMessages {
    success?: string;
    error?: string;
    info?: string;
    warning?: string;
    status?: string;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    currentOrganization?: Organization;
    flash?: FlashMessages;
    ziggy: Config & { location: string };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}
