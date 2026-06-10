import type { LucideIcon } from 'lucide-react';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: string;
    image: string | null;
    is_active: boolean;
    sort_order: number;
    category_id: string | null;
}

export interface Category {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    products: Product[];
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
