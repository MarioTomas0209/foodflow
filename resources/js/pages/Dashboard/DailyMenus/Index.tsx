import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Clock, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDailyMenuDate, formatDailyMenuTimeRange } from '@/lib/daily-menu';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type DailyMenu } from '@/types';

interface DailyMenusIndexProps {
    menus: DailyMenu[];
}

export default function Index({ menus }: DailyMenusIndexProps) {
    const handleDelete = (menu: DailyMenu) => {
        if (!window.confirm(`¿Eliminar el menú del ${formatDailyMenuDate(menu.date)}?`)) {
            return;
        }

        router.delete(route('dashboard.daily-menus.destroy', menu.id));
    };

    return (
        <DashboardLayout>
            <Head title="Menú del día" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Menú del día</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Publica platillos especiales que cambian cada día.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={route('dashboard.daily-menus.create')}>
                            <Plus className="size-4" />
                            Nuevo menú
                        </Link>
                    </Button>
                </div>

                {menus.length === 0 ? (
                    <Card>
                        <CardContent className="text-muted-foreground py-12 text-center text-sm">
                            Aún no tienes menús del día. Crea uno para el día de hoy o una fecha futura.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {menus.map((menu) => {
                            const timeRange = formatDailyMenuTimeRange(menu);

                            return (
                                <Card key={menu.id}>
                                    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <CardTitle className="text-lg capitalize">
                                                    {formatDailyMenuDate(menu.date)}
                                                </CardTitle>
                                                {menu.name && <Badge variant="secondary">{menu.name}</Badge>}
                                            </div>
                                            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarDays className="size-4" />
                                                    {menu.items_count ?? menu.items.length} platillos
                                                </span>
                                                {timeRange && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Clock className="size-4" />
                                                        {timeRange}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    menu.is_active
                                                        ? 'border-green-200 text-green-800'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {menu.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('dashboard.daily-menus.edit', menu.id)}>Editar</Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(menu)}
                                                aria-label="Eliminar menú"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
