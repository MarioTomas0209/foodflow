import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Menu, Settings, ShoppingBag, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { OrderNotificationsBell } from '@/components/dashboard/order-notifications-bell';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useOrderNotifications } from '@/hooks/use-order-notifications';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    isActive: (url: string) => boolean;
}

const navItems: NavItem[] = [
    {
        title: 'Inicio',
        href: route('dashboard.index'),
        icon: LayoutDashboard,
        isActive: (url) => url === '/dashboard' || url === '/dashboard/',
    },
    {
        title: 'Pedidos',
        href: route('dashboard.orders.index'),
        icon: ShoppingBag,
        isActive: (url) => url.startsWith('/dashboard/orders'),
    },
    {
        title: 'Menú',
        href: route('dashboard.menu.index'),
        icon: UtensilsCrossed,
        isActive: (url) => url.startsWith('/dashboard/menu'),
    },
    {
        title: 'Configuración',
        href: route('dashboard.settings'),
        icon: Settings,
        isActive: (url) => url.startsWith('/dashboard/settings'),
    },
];

function OrganizationBrand({ name, logo }: { name: string; logo: string | null | undefined }) {
    return (
        <div className="flex items-center gap-3">
            {logo ? (
                <img src={logo} alt={name} className="size-8 rounded-md object-cover" />
            ) : (
                <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md text-sm font-semibold">
                    {name.charAt(0)}
                </div>
            )}
            <span className="truncate font-semibold">{name}</span>
        </div>
    );
}

function NavLinks({ url, onNavigate }: { url: string; onNavigate?: () => void }) {
    return (
        <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
                const active = item.isActive(url);
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            active
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                        )}
                    >
                        <Icon className="size-4 shrink-0" />
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { currentOrganization } = usePage<SharedData>().props;
    const { url } = usePage();
    const [mobileOpen, setMobileOpen] = useState(false);

    const { notifications, unreadCount, markAllAsRead, dismiss } = useOrderNotifications(currentOrganization?.id);

    const organizationName = currentOrganization?.name ?? 'Mi negocio';

    const notificationsBell = (
        <OrderNotificationsBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllAsRead={markAllAsRead}
            onDismiss={dismiss}
        />
    );

    return (
        <div className="bg-background flex min-h-screen">
            <aside className="border-border bg-muted/40 hidden w-64 shrink-0 flex-col border-r p-6 md:flex">
                <OrganizationBrand name={organizationName} logo={currentOrganization?.logo} />
                <Separator className="my-6" />
                <NavLinks url={url} />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="border-border flex items-center justify-between gap-3 border-b p-4">
                    <span className="truncate font-semibold md:hidden">{organizationName}</span>
                    <div className="hidden md:block" />
                    <div className="ml-auto flex items-center gap-2">
                        {notificationsBell}
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menú">
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72">
                                <SheetHeader className="text-left">
                                    <SheetTitle className="sr-only">Navegación</SheetTitle>
                                </SheetHeader>
                                <div className="mt-2 flex flex-col gap-6">
                                    <OrganizationBrand name={organizationName} logo={currentOrganization?.logo} />
                                    <Separator />
                                    <NavLinks url={url} onNavigate={() => setMobileOpen(false)} />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
