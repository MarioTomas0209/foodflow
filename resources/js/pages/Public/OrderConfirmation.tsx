import { Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle2, MapPin, MessageCircle } from 'lucide-react';
import { useEffect } from 'react';

import { OrderStatusBadge } from '@/components/storefront/OrderStatusBadge';
import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format-currency';
import { getOrderDeliveryMapsUrl } from '@/lib/maps';
import {
    formatOrderDisplayNumber,
    ORDER_TYPE_LABELS,
    PAYMENT_METHOD_LABELS,
} from '@/lib/order-status';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { useNamedRoute } from '@/lib/ziggy';
import PublicLayout from '@/layouts/PublicLayout';
import { type Order, type PublicOrganization } from '@/types';

interface OrderConfirmationProps {
    order: Order;
    organization: PublicOrganization;
}

function formatPhoneDisplay(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.length >= 10) {
        return `${digits.slice(-10, -6)} ${digits.slice(-6, -4)} ${digits.slice(-4)}`.trim();
    }

    return phone;
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">{label}</p>
            <div className="text-sm leading-relaxed font-semibold">{children}</div>
        </div>
    );
}

export default function OrderConfirmation({ order, organization }: OrderConfirmationProps) {
    const namedRoute = useNamedRoute();
    const { customer } = usePage().props as { customer?: { id: string } | null };
    const whatsAppUrl = buildWhatsAppUrl(order, organization);
    const deliveryMapsUrl = getOrderDeliveryMapsUrl(order);
    const deliveryLabel = order.type === 'delivery' ? 'Domicilio' : ORDER_TYPE_LABELS[order.type];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <PublicLayout organization={organization} className="pb-8">
            <Head title={`Pedido #${formatOrderDisplayNumber(order.id)} — ${organization.name}`} />

            <div className="flex flex-col gap-4">
                <section className="flex flex-col items-center gap-4 py-2 text-center">
                    <div
                        className={cn(
                            'flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40',
                        )}
                    >
                        <CheckCircle2 className="size-9 text-green-600 dark:text-green-400" strokeWidth={1.75} />
                    </div>

                    <div className="space-y-2">
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                            Pedido registrado
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight">
                            #{formatOrderDisplayNumber(order.id)}
                        </h1>
                        <OrderStatusBadge status={order.status} className="px-3 py-1 text-xs" />
                        <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
                            Tu pedido fue recibido. Envía los detalles por WhatsApp para confirmarlo con{' '}
                            {organization.name}.
                        </p>
                    </div>
                </section>

                <section className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-sm">
                    <h2 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Información
                    </h2>

                    <div className="space-y-4">
                        <InfoField label="Cliente">{order.customer_name}</InfoField>
                        <InfoField label="Teléfono">{formatPhoneDisplay(order.customer_phone)}</InfoField>
                        <InfoField label="Método de entrega">{deliveryLabel}</InfoField>

                        {order.type === 'delivery' && order.delivery_address && (
                            <InfoField label="Dirección">
                                <span>
                                    {order.delivery_address}
                                    {order.delivery_city ? `, ${order.delivery_city}` : ''}
                                </span>
                                {deliveryMapsUrl && (
                                    <a
                                        href={deliveryMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            'mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                            storefrontAccent.pillMuted,
                                        )}
                                    >
                                        <MapPin className="size-3.5" />
                                        Abrir en Google Maps
                                    </a>
                                )}
                            </InfoField>
                        )}

                        <InfoField label="Método de pago">
                            {PAYMENT_METHOD_LABELS[order.payment_method]}
                        </InfoField>

                        {order.customer_notes && <InfoField label="Notas">{order.customer_notes}</InfoField>}
                    </div>
                </section>

                <section className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-sm">
                    <h2 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        Resumen
                    </h2>

                    <ul className="space-y-4">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex items-start gap-3">
                                <ProductThumbnail
                                    image={item.product_image}
                                    name={item.product_name}
                                    className="size-12 rounded-full"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-0.5">
                                            <p className="font-bold">{item.product_name}</p>
                                            {item.variant_name && (
                                                <p className="text-muted-foreground text-sm">{item.variant_name}</p>
                                            )}
                                            <p className="text-muted-foreground text-sm">
                                                {item.quantity} × {formatCurrency(item.unit_price)}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-bold tabular-nums">
                                            {formatCurrency(item.subtotal)}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <Separator />

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium tabular-nums">{formatCurrency(order.subtotal)}</span>
                        </div>
                        {Number(order.delivery_fee) > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Costo de envío</span>
                                <span className="font-medium tabular-nums">
                                    {formatCurrency(order.delivery_fee)}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-base font-bold">Total</span>
                            <span className={cn('text-xl font-bold tabular-nums', storefrontAccent.text)}>
                                {formatCurrency(order.total)}
                            </span>
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-2 pt-1">
                    {whatsAppUrl ? (
                        <Button
                            asChild
                            size="lg"
                            className={cn('h-12 w-full rounded-full text-base font-semibold', storefrontAccent.button)}
                        >
                            <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="size-5" />
                                Enviar pedido por WhatsApp
                            </a>
                        </Button>
                    ) : (
                        <p className="text-muted-foreground rounded-2xl border px-4 py-3 text-center text-sm">
                            Este negocio no tiene teléfono registrado para WhatsApp.
                        </p>
                    )}

                    {customer && (
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="h-12 w-full rounded-full text-base font-semibold"
                        >
                            <Link href={namedRoute('storefront.orders.show', [organization.slug, order.id])}>
                                Ver mi pedido
                            </Link>
                        </Button>
                    )}

                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="h-12 w-full rounded-full text-base font-semibold"
                    >
                        <Link href={namedRoute('storefront.show', organization.slug)}>Volver al menú</Link>
                    </Button>
                </div>
            </div>
        </PublicLayout>
    );
}
