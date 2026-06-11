import { Link } from '@inertiajs/react';
import { Bell, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type OrderNotification } from '@/hooks/use-order-notifications';
import { formatCurrency } from '@/lib/format-currency';
import { ORDER_TYPE_LABELS, formatOrderTime } from '@/lib/order-status';
import { cn } from '@/lib/utils';

interface OrderNotificationsBellProps {
    notifications: OrderNotification[];
    unreadCount: number;
    onMarkAllAsRead: () => void;
    onDismiss: (id: string) => void;
}

export function OrderNotificationsBell({
    notifications,
    unreadCount,
    onMarkAllAsRead,
    onDismiss,
}: OrderNotificationsBellProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative" aria-label="Notificaciones">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-xs font-medium">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Pedidos nuevos</span>
                    {notifications.length > 0 && (
                        <button
                            type="button"
                            onClick={onMarkAllAsRead}
                            className="text-muted-foreground hover:text-foreground text-xs font-normal"
                        >
                            Marcar leídas
                        </button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-6 text-center text-sm">No hay notificaciones</p>
                ) : (
                    notifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className={cn(
                                'flex cursor-default items-start gap-2 p-0 focus:bg-transparent',
                                !notification.read && 'bg-primary/5',
                            )}
                            onSelect={(event) => event.preventDefault()}
                        >
                            <Link
                                href={route('dashboard.orders.show', notification.id)}
                                className="hover:bg-muted/50 flex min-w-0 flex-1 flex-col gap-0.5 rounded-sm px-2 py-2"
                            >
                                <span className="font-medium">{notification.customer_name}</span>
                                <span className="text-muted-foreground text-xs">
                                    {ORDER_TYPE_LABELS[notification.type]} · {notification.items_count}{' '}
                                    {notification.items_count === 1 ? 'producto' : 'productos'}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {formatCurrency(notification.total)} · {formatOrderTime(notification.created_at)}
                                </span>
                            </Link>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                aria-label="Descartar notificación"
                                onClick={() => onDismiss(notification.id)}
                            >
                                <X className="size-4" />
                            </Button>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
