import type { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
}

export interface DashboardOrganization {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    logo: string | null;
}

export interface DeliveryZone {
    id: string;
    name: string;
    description: string | null;
    fee: string;
    center_lat: string;
    center_lng: string;
    radius_km: string;
    is_active: boolean;
    sort_order: number;
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
    hours?: OrganizationHour[];
    is_open_now?: boolean;
    has_delivery?: boolean;
}

export interface OrganizationHour {
    id?: string;
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
}

export interface ProductVariant {
    id: string;
    name: string;
    price: string;
    stock: number | null;
    is_active: boolean;
    sort_order: number;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: string;
    has_variants: boolean;
    stock: number | null;
    image: string | null;
    is_active: boolean;
    sort_order: number;
    category_id: string | null;
    variants: ProductVariant[];
}

export type CategoryScheduleType = 'informative' | 'restricted';

export interface Category {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    available_from: string | null;
    available_until: string | null;
    available_days: number[] | null;
    schedule_type: CategoryScheduleType;
    is_available_now: boolean;
    can_order_now: boolean;
    products: Product[];
}

export interface DailyMenuItemVariant {
    id: string;
    name: string;
    price: string;
    stock: number | null;
    sort_order: number;
}

export interface DailyMenuItem {
    id: string;
    name: string;
    description: string | null;
    has_variants: boolean;
    price: string;
    stock: number | null;
    sort_order: number;
    image: string | null;
    is_available?: boolean;
    variants: DailyMenuItemVariant[];
}

export interface DailyMenu {
    id: string;
    date: string;
    name: string | null;
    available_from: string | null;
    available_until: string | null;
    is_active?: boolean;
    is_available_now: boolean;
    can_order_now: boolean;
    items: DailyMenuItem[];
    items_count?: number;
}

export type CartSource = 'menu' | 'daily';

export interface CartableVariant {
    id: string;
    name: string;
    price: string;
    stock: number | null;
}

export interface CartableProduct {
    id: string;
    name: string;
    price: string;
    image: string | null;
    has_variants: boolean;
    stock: number | null;
    variants: CartableVariant[];
    source: CartSource;
}

export interface CartItem {
    productId: string;
    productName: string;
    productImage: string | null;
    variantId: string | null;
    variantName: string | null;
    price: number;
    quantity: number;
    maxStock: number | null;
    source: CartSource;
}

export interface Cart {
    organizationId: string;
    items: CartItem[];
}

export interface OrderItem {
    id: string;
    product_name: string;
    variant_name: string | null;
    product_image: string | null;
    unit_price: string;
    quantity: number;
    subtotal: string;
}

export interface Order {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_notes: string | null;
    type: 'pickup' | 'delivery';
    delivery_address: string | null;
    delivery_city: string | null;
    latitude: number | null;
    longitude: number | null;
    delivery_maps_url: string | null;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'en_route' | 'delivered' | 'cancelled';
    payment_method: 'cash' | 'transfer';
    subtotal: string;
    delivery_fee: string;
    total: string;
    is_preorder?: boolean;
    scheduled_for?: string | null;
    items: OrderItem[];
    created_at: string;
    organization?: {
        id: string;
        name: string;
        slug: string;
    };
}

export interface OrderFilters {
    status: 'all' | Order['status'];
    type: 'all' | Order['type'];
    date: string;
    search: string;
}

export interface PaginatedOrders {
    data: Order[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

export interface Auth {
    user: User;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
}

export interface CustomerAddress {
    id: string;
    label: string | null;
    address: string;
    city: string;
    latitude: string | null;
    longitude: string | null;
    maps_url: string | null;
    is_default: boolean;
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
    customer: Customer | null;
    currentOrganization?: Organization;
    flash?: FlashMessages;
    today: string;
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
