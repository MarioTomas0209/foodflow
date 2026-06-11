import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Clock, DollarSign, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type Organization } from '@/types';

interface DashboardStats {
    orders_today: number;
    orders_pending: number;
    revenue_today: number;
}

interface DashboardPageProps {
    organization: Organization;
    stats: DashboardStats;
    isFirstDay: boolean;
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

export default function Index({ organization, stats, isFirstDay }: DashboardPageProps) {
    return (
        <DashboardLayout>
            <Head title="Dashboard" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{organization.name}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Panel de control de tu negocio</p>
                </div>

                {isFirstDay && (
                    <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
                        <p className="font-medium">¡Bienvenido a FoodFlow!</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Es tu primer día con {organization.name}. Aquí verás tus pedidos e ingresos cuando empieces a recibirlos.
                        </p>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pedidos hoy</CardTitle>
                            <ShoppingBag className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{stats.orders_today}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                            <Clock className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{stats.orders_pending}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Ingresos hoy</CardTitle>
                            <DollarSign className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{formatCurrency(stats.revenue_today)}</p>
                        </CardContent>
                    </Card>
                </div>

                <Button asChild variant="outline" className="w-fit">
                    <Link href={route('dashboard.orders.index')}>
                        Ver pedidos de hoy
                        <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </div>
        </DashboardLayout>
    );
}
