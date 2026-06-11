import { type Order } from '@/types';

export const ORDER_STATUSES: Order['status'][] = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
];

export const ORDER_STATUS_LABELS: Record<Order['status'], string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Listo',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
};

export const ORDER_TYPE_LABELS: Record<Order['type'], string> = {
    pickup: 'Recoger en sucursal',
    delivery: 'A domicilio',
};

export const PAYMENT_METHOD_LABELS: Record<Order['payment_method'], string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
};

export function orderStatusBadgeClass(status: Order['status']): string {
    switch (status) {
        case 'pending':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        case 'confirmed':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
        case 'preparing':
            return 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300';
        case 'ready':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
        case 'delivered':
            return 'bg-muted text-muted-foreground';
        case 'cancelled':
            return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    }
}

export function formatOrderTime(isoDate: string): string {
    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(isoDate));
}
