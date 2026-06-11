import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format-currency';
import { buildMapsUrl } from '@/lib/maps';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { useNamedRoute } from '@/lib/ziggy';
import PublicLayout from '@/layouts/PublicLayout';
import { type Order, type PublicOrganization } from '@/types';

interface OrderConfirmationProps {
    order: Order;
    organization: PublicOrganization;
}

export default function OrderConfirmation({ order, organization }: OrderConfirmationProps) {
    const namedRoute = useNamedRoute();
    const whatsAppUrl = buildWhatsAppUrl(order, organization);

    return (
        <PublicLayout organization={organization}>
            <Head title={`Pedido confirmado — ${organization.name}`} />

            <div className="flex flex-col items-center gap-6 py-6 text-center">
                <CheckCircle2 className="text-primary size-16" strokeWidth={1.5} />

                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">¡Pedido recibido!</h1>
                    <p className="text-muted-foreground text-sm">
                        Tu pedido fue registrado. Envía los detalles por WhatsApp para confirmarlo con el negocio.
                    </p>
                </div>

                <section className="bg-muted/40 w-full space-y-4 rounded-xl border p-4 text-left">
                    <div className="space-y-1 text-sm">
                        <p>
                            <span className="text-muted-foreground">Cliente:</span> {order.customer_name}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Teléfono:</span> {order.customer_phone}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Entrega:</span>{' '}
                            {order.type === 'pickup' ? 'Recoger en sucursal' : 'A domicilio'}
                        </p>
                        {order.type === 'delivery' && (
                            <>
                                <p>
                                    <span className="text-muted-foreground">Dirección:</span> {order.delivery_address},{' '}
                                    {order.delivery_city}
                                </p>
                                {order.latitude && order.longitude && (
                                    <p>
                                        <span className="text-muted-foreground">Ubicación:</span>{' '}
                                        <a
                                            href={buildMapsUrl(order.latitude, order.longitude)}
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
                            {order.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                        </p>
                    </div>

                    <Separator />

                    <ul className="space-y-2">
                        {order.items.map((item) => (
                            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                                <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    {item.variant_name && (
                                        <p className="text-muted-foreground">{item.variant_name}</p>
                                    )}
                                    <p className="text-muted-foreground">x{item.quantity}</p>
                                </div>
                                <span className="font-medium tabular-nums">{formatCurrency(item.subtotal)}</span>
                            </li>
                        ))}
                    </ul>

                    <Separator />

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium tabular-nums">{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.type === 'delivery' && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Costo de envío</span>
                            <span className="font-medium tabular-nums">{formatCurrency(order.delivery_fee)}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-lg font-semibold tabular-nums">{formatCurrency(order.total)}</span>
                    </div>
                </section>

                {whatsAppUrl ? (
                    <Button asChild size="lg" className="w-full rounded-xl">
                        <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="size-5" />
                            Enviar pedido por WhatsApp
                        </a>
                    </Button>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Este negocio no tiene teléfono registrado para WhatsApp.
                    </p>
                )}

                <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href={namedRoute('storefront.show', organization.slug)}>Volver al menú</Link>
                </Button>
            </div>
        </PublicLayout>
    );
}
