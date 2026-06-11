import { Head, Link, router } from '@inertiajs/react';
import { Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format-currency';
import {
    ORDER_STATUS_LABELS,
    ORDER_STATUSES,
    ORDER_TYPE_LABELS,
    formatOrderTime,
    orderStatusBadgeClass,
} from '@/lib/order-status';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type OrderFilters, type PaginatedOrders } from '@/types';

interface OrdersIndexProps {
    orders: PaginatedOrders;
    filters: OrderFilters;
}

export default function Index({ orders, filters }: OrdersIndexProps) {
    const applyFilters = (next: Partial<OrderFilters>) => {
        router.get(
            route('dashboard.orders.index'),
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <DashboardLayout>
            <Head title="Pedidos" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pedidos de hoy</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Gestiona los pedidos recibidos hoy en tu negocio.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <label htmlFor="status-filter" className="text-sm font-medium">
                            Estado
                        </label>
                        <Select value={filters.status} onValueChange={(status) => applyFilters({ status: status as OrderFilters['status'] })}>
                            <SelectTrigger id="status-filter">
                                <SelectValue placeholder="Todos los estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {ORDER_STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {ORDER_STATUS_LABELS[status]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="type-filter" className="text-sm font-medium">
                            Tipo de entrega
                        </label>
                        <Select value={filters.type} onValueChange={(type) => applyFilters({ type: type as OrderFilters['type'] })}>
                            <SelectTrigger id="type-filter">
                                <SelectValue placeholder="Todos los tipos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pickup">{ORDER_TYPE_LABELS.pickup}</SelectItem>
                                <SelectItem value="delivery">{ORDER_TYPE_LABELS.delivery}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {orders.data.length === 0 ? (
                    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
                        <Package className="text-muted-foreground size-10" strokeWidth={1.5} />
                        <div>
                            <p className="font-medium">No hay pedidos</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Cuando recibas pedidos hoy, aparecerán aquí.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {orders.data.map((order) => (
                            <Link
                                key={order.id}
                                href={route('dashboard.orders.show', order.id)}
                                className="border-border hover:bg-muted/40 block rounded-xl border p-4 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold">{order.customer_name}</p>
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusBadgeClass(order.status)}`}
                                            >
                                                {ORDER_STATUS_LABELS[order.status]}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            {ORDER_TYPE_LABELS[order.type]} · {order.items.length}{' '}
                                            {order.items.length === 1 ? 'producto' : 'productos'}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-semibold tabular-nums">{formatCurrency(order.total)}</p>
                                        <p className="text-muted-foreground text-sm tabular-nums">
                                            {formatOrderTime(order.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

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
            </div>
        </DashboardLayout>
    );
}
