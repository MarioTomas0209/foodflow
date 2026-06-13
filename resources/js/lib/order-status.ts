import { type Order } from '@/types';

export const ORDER_STATUSES: Order['status'][] = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'en_route',
    'delivered',
    'cancelled',
];

export const ORDER_STATUS_LABELS: Record<Order['status'], string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Listo',
    en_route: 'En camino',
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
        case 'en_route':
            return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
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

export function formatScheduledTime(isoDate: string): string {
    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(isoDate));
}

export function formatOrderDate(isoDate: string): string {
    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(isoDate));
}

export function formatOrderListDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const time = formatOrderTime(isoDate);

    if (date.toDateString() === now.toDateString()) {
        return `Hoy, ${time}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return `Ayer, ${time}`;
    }

    const dayLabel = new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
    }).format(date);

    return `${dayLabel}, ${time}`;
}

export function isOrderActive(status: Order['status']): boolean {
    return status !== 'delivered' && status !== 'cancelled';
}

export function orderStatusCustomerBadgeClass(status: Order['status']): string {
    return orderStatusBadgeClass(status);
}

/** Status options shown in dashboard for a given order type. */
export function orderStatusesForType(type: Order['type']): Order['status'][] {
    if (type === 'delivery') {
        return ORDER_STATUSES;
    }

    return ORDER_STATUSES.filter((status) => status !== 'en_route');
}

export interface OrderTimelineStep {
    label: string;
    progressLabel?: string;
}

export function getOrderTimelineSteps(type: Order['type']): OrderTimelineStep[] {
    if (type === 'delivery') {
        return [
            { label: 'Pedido recibido' },
            { label: 'Confirmado' },
            { label: 'Preparando alimentos', progressLabel: 'En progreso' },
            { label: 'En camino' },
            { label: 'Entregado' },
        ];
    }

    return [
        { label: 'Pedido recibido' },
        { label: 'Confirmado' },
        { label: 'Preparando alimentos', progressLabel: 'En progreso' },
        { label: 'Listo para recoger' },
        { label: 'Entregado' },
    ];
}

export function getOrderStatusStepIndex(status: Order['status'], type: Order['type']): number {
    if (status === 'cancelled') {
        return -1;
    }

    if (type === 'delivery') {
        switch (status) {
            case 'pending':
                return 0;
            case 'confirmed':
                return 1;
            case 'preparing':
                return 2;
            case 'ready':
                return 2;
            case 'en_route':
                return 3;
            case 'delivered':
                return 4;
        }
    }

    switch (status) {
        case 'pending':
            return 0;
        case 'confirmed':
            return 1;
        case 'preparing':
            return 2;
        case 'ready':
        case 'en_route':
            return 3;
        case 'delivered':
            return 4;
    }
}

export type OrderTimelineStepState = 'completed' | 'current' | 'upcoming' | 'cancelled';

export function getTimelineStepState(
    stepIndex: number,
    status: Order['status'],
    type: Order['type'],
): OrderTimelineStepState {
    if (status === 'cancelled') {
        return stepIndex === 0 ? 'cancelled' : 'upcoming';
    }

    if (status === 'delivered') {
        return 'completed';
    }

    const currentStep = getOrderStatusStepIndex(status, type);

    if (stepIndex < currentStep) {
        return 'completed';
    }

    if (stepIndex === currentStep) {
        return 'current';
    }

    return 'upcoming';
}

export function formatOrderDisplayNumber(orderId: string): string {
    return orderId.slice(-4).toUpperCase();
}
