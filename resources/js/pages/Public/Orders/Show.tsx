import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format-currency';
import { getOrderDeliveryMapsUrl } from '@/lib/maps';
import {
    formatOrderDate,
    ORDER_STATUS_LABELS,
    ORDER_TYPE_LABELS,
    PAYMENT_METHOD_LABELS,
    orderStatusBadgeClass,
} from '@/lib/order-status';
import { useNamedRoute } from '@/lib/ziggy';
import PublicLayout from '@/layouts/PublicLayout';
import { type Order, type PublicOrganization } from '@/types';

interface CustomerOrderShowProps {
    organization: PublicOrganization;
    order: Order;
}

export default function Show({ organization, order }: CustomerOrderShowProps) {
    const namedRoute = useNamedRoute();
    const deliveryMapsUrl = getOrderDeliveryMapsUrl(order);
    const isInProgress = order.status === 'pending' || order.status === 'confirmed';

    return (
        <PublicLayout organization={organization}>
            <Head title={`Pedido — ${organization.name}`} />

            <div className="flex flex-col gap-6 pb-8">
                <Button variant="ghost" className="w-fit px-0" asChild>
                    <Link href={namedRoute('storefront.orders.index', organization.slug)}>
                        <ArrowLeft className="size-4" />
                        Mis pedidos
                    </Link>
                </Button>

                <div className="space-y-3">
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${orderStatusBadgeClass(order.status)}`}
                    >
                        {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold">Detalle del pedido</h1>
                        <p className="text-muted-foreground mt-1 text-sm">{formatOrderDate(order.created_at)}</p>
                    </div>
                </div>

                {isInProgress && (
                    <div className="border-border bg-muted/40 rounded-xl border p-4 text-sm">
                        Tu pedido está siendo preparado. Te avisaremos cuando esté listo.
                    </div>
                )}

                <section className="bg-muted/40 space-y-3 rounded-xl border p-4 text-sm">
                    <h2 className="font-semibold">Información</h2>
                    <p>
                        <span className="text-muted-foreground">Cliente:</span> {order.customer_name}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Teléfono:</span> {order.customer_phone}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Entrega:</span> {ORDER_TYPE_LABELS[order.type]}
                    </p>
                    {order.type === 'delivery' && (
                        <>
                            <p>
                                <span className="text-muted-foreground">Dirección:</span> {order.delivery_address},{' '}
                                {order.delivery_city}
                            </p>
                            {deliveryMapsUrl && (
                                <p>
                                    <span className="text-muted-foreground">Ubicación:</span>{' '}
                                    <a
                                        href={deliveryMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline-offset-4 hover:underline"
                                    >
                                        Ver en Google Maps
                                    </a>
                                </p>
                            )}
                        </>
                    )}
                    <p>
                        <span className="text-muted-foreground">Pago:</span>{' '}
                        {PAYMENT_METHOD_LABELS[order.payment_method]}
                    </p>
                    {order.customer_notes && (
                        <p>
                            <span className="text-muted-foreground">Notas:</span> {order.customer_notes}
                        </p>
                    )}
                </section>

                <section className="bg-muted/40 space-y-4 rounded-xl border p-4">
                    <h2 className="font-semibold">Productos</h2>
                    <ul className="space-y-3">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex items-start gap-3 text-sm">
                                <ProductThumbnail
                                    image={item.product_image}
                                    name={item.product_name}
                                    className="size-12"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{item.product_name}</p>
                                            {item.variant_name && (
                                                <p className="text-muted-foreground">{item.variant_name}</p>
                                            )}
                                            <p className="text-muted-foreground">
                                                {item.quantity} × {formatCurrency(item.unit_price)}
                                            </p>
                                        </div>
                                        <span className="font-medium tabular-nums">
                                            {formatCurrency(item.subtotal)}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <Separator />

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
                        </div>
                        {Number(order.delivery_fee) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Envío</span>
                                <span className="tabular-nums">{formatCurrency(order.delivery_fee)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">{formatCurrency(order.total)}</span>
                        </div>
                    </div>
                </section>

                <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href={namedRoute('storefront.show', organization.slug)}>Volver al menú</Link>
                </Button>
            </div>
        </PublicLayout>
    );
}
