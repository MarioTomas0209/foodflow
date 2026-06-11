import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Copy, ExternalLink, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format-currency';
import { getOrderDeliveryMapsUrl } from '@/lib/maps';
import {
    ORDER_STATUS_LABELS,
    ORDER_STATUSES,
    ORDER_TYPE_LABELS,
    PAYMENT_METHOD_LABELS,
    formatOrderTime,
    orderStatusBadgeClass,
} from '@/lib/order-status';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type Order } from '@/types';

interface OrderShowProps {
    order: Order;
}

export default function Show({ order }: OrderShowProps) {
    const [mapsUrlCopied, setMapsUrlCopied] = useState(false);

    const deliveryMapsUrl = useMemo(() => getOrderDeliveryMapsUrl(order), [order]);

    const copyDeliveryMapsUrl = async () => {
        if (!deliveryMapsUrl) {
            return;
        }

        await navigator.clipboard.writeText(deliveryMapsUrl);
        setMapsUrlCopied(true);
        setTimeout(() => setMapsUrlCopied(false), 2000);
    };

    const updateStatus = (status: Order['status']) => {
        router.patch(
            route('dashboard.orders.update-status', order.id),
            { status },
            { preserveScroll: true },
        );
    };

    return (
        <DashboardLayout>
            <Head title={`Pedido — ${order.customer_name}`} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <Button asChild variant="ghost" className="w-fit px-0">
                    <Link href={route('dashboard.orders.index')} preserveScroll>
                        <ArrowLeft className="size-4" />
                        Volver a pedidos
                    </Link>
                </Button>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{order.customer_name}</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Recibido a las {formatOrderTime(order.created_at)}
                        </p>
                    </div>
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${orderStatusBadgeClass(order.status)}`}
                    >
                        {ORDER_STATUS_LABELS[order.status]}
                    </span>
                </div>

                <section className="border-border space-y-4 rounded-xl border p-4">
                    <h2 className="font-semibold">Estado del pedido</h2>
                    <Select value={order.status} onValueChange={(status) => updateStatus(status as Order['status'])}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ORDER_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {ORDER_STATUS_LABELS[status]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </section>

                <section className="border-border space-y-3 rounded-xl border p-4 text-sm">
                    <h2 className="font-semibold">Cliente</h2>
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
                                <div className="bg-muted/40 space-y-3 rounded-lg border p-3">
                                    <p className="font-medium">Ubicación para el repartidor</p>
                                    <p className="text-muted-foreground text-xs">
                                        Enlace que el cliente compartió desde Google Maps.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button asChild variant="outline" size="sm">
                                            <a
                                                href={deliveryMapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <MapPin className="size-4" />
                                                Abrir en Google Maps
                                                <ExternalLink className="size-4" />
                                            </a>
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={copyDeliveryMapsUrl}>
                                            <Copy className="size-4" />
                                            {mapsUrlCopied ? '¡Copiado!' : 'Copiar enlace'}
                                        </Button>
                                    </div>
                                    <p className="text-muted-foreground break-all text-xs">{deliveryMapsUrl}</p>
                                </div>
                            )}
                        </>
                    )}
                    <p>
                        <span className="text-muted-foreground">Pago:</span> {PAYMENT_METHOD_LABELS[order.payment_method]}
                    </p>
                    {order.customer_notes && (
                        <p>
                            <span className="text-muted-foreground">Notas:</span> {order.customer_notes}
                        </p>
                    )}
                </section>

                <section className="border-border space-y-4 rounded-xl border p-4">
                    <h2 className="font-semibold">Productos</h2>
                    <ul className="space-y-3">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                                <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    {item.variant_name && (
                                        <p className="text-muted-foreground">{item.variant_name}</p>
                                    )}
                                    <p className="text-muted-foreground">
                                        {item.quantity} × {formatCurrency(item.unit_price)}
                                    </p>
                                </div>
                                <span className="font-medium tabular-nums">{formatCurrency(item.subtotal)}</span>
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
            </div>
        </DashboardLayout>
    );
}
