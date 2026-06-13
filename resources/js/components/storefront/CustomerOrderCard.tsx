import { Link } from '@inertiajs/react';

import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { OrderStatusBadge } from '@/components/storefront/OrderStatusBadge';
import { formatCurrency } from '@/lib/format-currency';
import { formatOrderListDate, isOrderActive } from '@/lib/order-status';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type Order, type PublicOrganization } from '@/types';

interface CustomerOrderCardProps {
    order: Order;
    organization: PublicOrganization;
    href: string;
}

export function CustomerOrderCard({ order, organization, href }: CustomerOrderCardProps) {
    const active = isOrderActive(order.status);
    const organizationName = order.organization?.name ?? organization.name;
    const productLabel = order.items.length === 1 ? 'producto' : 'productos';

    return (
        <Link
            href={href}
            className={cn(
                'bg-card hover:bg-muted/30 block rounded-2xl border p-4 shadow-sm transition-colors',
                active ? storefrontAccent.cardActive : 'border-border',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <p className="truncate text-base font-bold">{organizationName}</p>
                    <p className="text-muted-foreground text-sm">
                        {formatOrderListDate(order.created_at)} · {order.items.length} {productLabel}
                    </p>
                </div>
                <OrderStatusBadge status={order.status} />
            </div>

            {order.items.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                    {order.items.slice(0, 4).map((item) => (
                        <ProductThumbnail
                            key={item.id}
                            image={item.product_image}
                            name={item.product_name}
                            className="size-10 rounded-xl"
                        />
                    ))}
                    {order.items.length > 4 && (
                        <span className="text-muted-foreground text-xs font-semibold">
                            +{order.items.length - 4}
                        </span>
                    )}
                </div>
            )}

            <div className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-3">
                <p className="text-base font-bold tabular-nums">{formatCurrency(order.total)}</p>
                <span className={cn('text-sm font-semibold', storefrontAccent.text)}>Ver detalles →</span>
            </div>
        </Link>
    );
}
