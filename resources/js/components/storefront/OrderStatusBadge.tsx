import { Check, X } from 'lucide-react';

import { ORDER_STATUS_LABELS, orderStatusBadgeClass } from '@/lib/order-status';
import { cn } from '@/lib/utils';
import { type Order } from '@/types';

interface OrderStatusBadgeProps {
    status: Order['status'];
    className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
    const label = ORDER_STATUS_LABELS[status].toUpperCase();

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide',
                orderStatusBadgeClass(status),
                className,
            )}
        >
            {status === 'delivered' ? (
                <Check className="size-3" />
            ) : status === 'cancelled' ? (
                <X className="size-3" />
            ) : (
                <span aria-hidden>•</span>
            )}
            {label}
        </span>
    );
}
