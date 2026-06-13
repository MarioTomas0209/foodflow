import { Head, Link, router, usePage } from '@inertiajs/react';
import { Package, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { formatCurrency } from '@/lib/format-currency';
import {
    formatOrderDisplayNumber,
    ORDER_STATUS_LABELS,
    ORDER_STATUSES,
    ORDER_TYPE_LABELS,
    formatOrderTime,
    formatScheduledTime,
    orderStatusBadgeClass,
} from '@/lib/order-status';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type OrderFilters, type PaginatedOrders, type SharedData } from '@/types';

interface OrdersIndexProps {
    orders: PaginatedOrders;
    filters: OrderFilters;
}

export default function Index({ orders, filters }: OrdersIndexProps) {
    const { today } = usePage<SharedData>().props;
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const isSearching = (filters.search ?? '').length > 0;
    const isToday = filters.date === today;
    const title = isSearching
        ? 'Buscar pedido'
        : isToday
          ? 'Pedidos de hoy'
          : `Pedidos del ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(`${filters.date}T12:00:00`))}`;

    const applyFilters = (next: Partial<OrderFilters>) => {
        router.get(
            route('dashboard.orders.index'),
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const normalizedSearch = searchInput.trim().replace(/^#/, '').toUpperCase();

            if (normalizedSearch !== (filters.search ?? '')) {
                applyFilters({ search: normalizedSearch });
            }
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [searchInput, filters.search]);

    return (
        <DashboardLayout>
            <Head title="Pedidos" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {isSearching
                            ? 'Busca por el número corto del pedido, por ejemplo #A1B2.'
                            : isToday
                              ? 'Gestiona los pedidos recibidos hoy en tu negocio.'
                              : 'Consulta los pedidos recibidos en la fecha seleccionada.'}
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="grid gap-2">
                        <label htmlFor="order-search" className="text-sm font-medium">
                            Buscar pedido
                        </label>
                        <div className="relative">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                id="order-search"
                                type="search"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Buscar por #XXXX o ID completo"
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <label htmlFor="status-filter" className="text-sm font-medium">
                                Estado
                            </label>
                            <Select
                                value={filters.status}
                                onValueChange={(status) =>
                                    applyFilters({ status: status as OrderFilters['status'] })
                                }
                            >
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
                            <Select
                                value={filters.type}
                                onValueChange={(type) => applyFilters({ type: type as OrderFilters['type'] })}
                            >
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

                        <div className="grid gap-2">
                            <label htmlFor="date-filter" className="text-sm font-medium">
                                Fecha
                            </label>
                            <Input
                                id="date-filter"
                                type="date"
                                value={filters.date}
                                max={today}
                                disabled={isSearching}
                                onChange={(e) => applyFilters({ date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {orders.data.length === 0 ? (
                    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
                        <Package className="text-muted-foreground size-10" strokeWidth={1.5} />
                        <div>
                            <p className="font-medium">No hay pedidos</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {isSearching
                                    ? 'No encontramos pedidos con ese número.'
                                    : 'No hay pedidos registrados para esta fecha.'}
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
                                            <p className="font-semibold">#{formatOrderDisplayNumber(order.id)}</p>
                                            <p className="font-semibold">{order.customer_name}</p>
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusBadgeClass(order.status)}`}
                                            >
                                                {ORDER_STATUS_LABELS[order.status]}
                                            </span>
                                            {order.is_preorder && order.scheduled_for && (
                                                <Badge variant="outline" className="rounded-full">
                                                    Programado para {formatScheduledTime(order.scheduled_for)}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            {ORDER_TYPE_LABELS[order.type]} · {order.items.length}{' '}
                                            {order.items.length === 1 ? 'producto' : 'productos'}
                                        </p>
                                        {order.items.length > 0 && (
                                            <div className="flex items-center gap-1.5 pt-2">
                                                {order.items.slice(0, 4).map((item) => (
                                                    <ProductThumbnail
                                                        key={item.id}
                                                        image={item.product_image}
                                                        name={item.product_name}
                                                        className="size-9"
                                                    />
                                                ))}
                                                {order.items.length > 4 && (
                                                    <span className="text-muted-foreground pl-1 text-xs font-medium">
                                                        +{order.items.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}
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
