import { Head, Link } from '@inertiajs/react';
import { Package } from 'lucide-react';

import { CustomerOrderCard } from '@/components/storefront/CustomerOrderCard';
import { Button } from '@/components/ui/button';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
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
        <PublicLayout organization={organization} className="pb-8">
            <Head title={`Mis pedidos — ${organization.name}`} />

            <div className="flex flex-col gap-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        Consulta el estado y el historial de tus órdenes en tiempo real.
                    </p>
                </div>

                {orders.data.length === 0 ? (
                    <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
                        <Package className="text-muted-foreground size-10" strokeWidth={1.5} />
                        <div className="space-y-1">
                            <p className="font-semibold">Aún no tienes pedidos</p>
                            <p className="text-muted-foreground text-sm">
                                Cuando hagas un pedido, aparecerá aquí para que puedas ver su estado.
                            </p>
                        </div>
                        <Button asChild className={cn('rounded-full', storefrontAccent.button)}>
                            <Link href={namedRoute('storefront.show', organization.slug)}>Ver menú</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-3">
                            {orders.data.map((order) => (
                                <CustomerOrderCard
                                    key={order.id}
                                    order={order}
                                    organization={organization}
                                    href={route('storefront.orders.show', [organization.slug, order.id])}
                                />
                            ))}
                        </div>

                        {orders.last_page > 1 && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
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
                                            className={cn(
                                                'rounded-full',
                                                link.active && storefrontAccent.button,
                                            )}
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
