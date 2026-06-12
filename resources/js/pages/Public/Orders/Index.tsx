import { Head, Link } from '@inertiajs/react';
import { Package } from 'lucide-react';

import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import { formatOrderDate, ORDER_STATUS_LABELS, orderStatusBadgeClass } from '@/lib/order-status';
import { useNamedRoute } from '@/lib/ziggy';
import PublicLayout from '@/layouts/PublicLayout';
import { type PaginatedOrders, type PublicOrganization } from '@/types';

interface CustomerOrdersIndexProps {
    organization: PublicOrganization;
    orders: PaginatedOrders;
}

export default function Index({ organization, orders }: CustomerOrdersIndexProps) {
    const namedRoute = useNamedRoute();

    return (
        <PublicLayout organization={organization}>
            <Head title={`Mis pedidos — ${organization.name}`} />

            <div className="flex flex-col gap-6 pb-8">
                <div>
                    <h1 className="text-2xl font-semibold">Mis pedidos</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Pedidos que has realizado en {organization.name}.
                    </p>
                </div>

                {orders.data.length === 0 ? (
                    <div className="border-border flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
                        <Package className="text-muted-foreground size-10" strokeWidth={1.5} />
                        <div className="space-y-1">
                            <p className="font-medium">Aún no tienes pedidos</p>
                            <p className="text-muted-foreground text-sm">
                                Cuando hagas un pedido, aparecerá aquí para que puedas ver su estado.
                            </p>
                        </div>
                        <Button asChild className="rounded-xl">
                            <Link href={namedRoute('storefront.show', organization.slug)}>Ver menú</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-3">
                            {orders.data.map((order) => (
                                <Link
                                    key={order.id}
                                    href={namedRoute('storefront.orders.show', [organization.slug, order.id])}
                                    className="border-border hover:bg-muted/40 block rounded-xl border p-4 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold">
                                                    {order.organization?.name ?? organization.name}
                                                </p>
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusBadgeClass(order.status)}`}
                                                >
                                                    {ORDER_STATUS_LABELS[order.status]}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-sm">
                                                {formatOrderDate(order.created_at)} · {order.items.length}{' '}
                                                {order.items.length === 1 ? 'producto' : 'productos'}
                                            </p>
                                            {order.items.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    {order.items.slice(0, 4).map((item) => (
                                                        <ProductThumbnail
                                                            key={item.id}
                                                            image={item.product_image}
                                                            name={item.product_name}
                                                            className="size-8"
                                                        />
                                                    ))}
                                                    {order.items.length > 4 && (
                                                        <span className="text-muted-foreground text-xs font-medium">
                                                            +{order.items.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="shrink-0 font-semibold tabular-nums">
                                            {formatCurrency(order.total)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {orders.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                {orders.links.map((link) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={link.label}
                                                className="text-muted-foreground px-3 py-2 text-sm"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    }

                                    return (
                                        <Button
                                            key={link.label}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={link.url}
                                                preserveState
                                                preserveScroll
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </PublicLayout>
    );
}
