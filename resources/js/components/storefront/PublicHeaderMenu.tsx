import { Link, router } from '@inertiajs/react';
import { Home, LogIn, LogOut, Menu, Moon, Package, Smartphone, Sun, UserPlus } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useAppearance } from '@/hooks/use-appearance';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { scrollDocumentToTop } from '@/lib/scroll';
import { useNamedRoute } from '@/lib/ziggy';
import { cn } from '@/lib/utils';
import { storefrontAccent } from '@/lib/storefront-theme';
import { type PublicOrganization } from '@/types';

interface PublicHeaderMenuProps {
    organization: PublicOrganization;
    customerName?: string;
}

function menuLinkClassName(highlight = false) {
    return cn(
        'hover:bg-muted flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors',
        highlight && storefrontAccent.button,
    );
}

export function PublicHeaderMenu({ organization, customerName }: PublicHeaderMenuProps) {
    const namedRoute = useNamedRoute();
    const { appearance, updateAppearance } = useAppearance();
    const { canInstall, install } = usePwaInstall();

    const isDark = useMemo(() => {
        if (appearance === 'dark') {
            return true;
        }

        if (appearance === 'light') {
            return false;
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }, [appearance]);

    const toggleTheme = () => {
        updateAppearance(isDark ? 'light' : 'dark');
    };

    const handleLogout = () => {
        router.post(namedRoute('storefront.logout', organization.slug));
    };

    return (
        <div className="flex shrink-0 items-center gap-1">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                onClick={toggleTheme}
                aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
                {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>

            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                        aria-label="Abrir menú"
                    >
                        <Menu className="size-5" />
                    </Button>
                </SheetTrigger>

                <SheetContent side="right" className="flex w-[min(100vw-2rem,20rem)] flex-col">
                    <SheetHeader className="text-left">
                        <SheetTitle>{organization.name}</SheetTitle>
                        <SheetDescription>
                            {customerName ? `Hola, ${customerName}` : 'Menú de la tienda'}
                        </SheetDescription>
                    </SheetHeader>

                    <nav className="mt-6 flex flex-1 flex-col gap-1">
                        <SheetClose asChild>
                            <Link
                                href={namedRoute('storefront.show', organization.slug)}
                                className={menuLinkClassName()}
                                onFinish={scrollDocumentToTop}
                            >
                                <Home className="size-4" />
                                Inicio
                            </Link>
                        </SheetClose>

                        {canInstall && (
                            <button
                                type="button"
                                onClick={() => void install()}
                                className={menuLinkClassName(true)}
                            >
                                <Smartphone className="size-4" />
                                Instalar app
                            </button>
                        )}

                        {customerName ? (
                            <>
                                <SheetClose asChild>
                                    <Link
                                        href={namedRoute('storefront.orders.index', organization.slug)}
                                        className={menuLinkClassName()}
                                    >
                                        <Package className="size-4" />
                                        Mis pedidos
                                    </Link>
                                </SheetClose>

                                <button type="button" onClick={handleLogout} className={menuLinkClassName()}>
                                    <LogOut className="size-4" />
                                    Salir
                                </button>
                            </>
                        ) : (
                            <>
                                <SheetClose asChild>
                                    <Link
                                        href={namedRoute('storefront.login', organization.slug)}
                                        className={menuLinkClassName()}
                                    >
                                        <LogIn className="size-4" />
                                        Entrar
                                    </Link>
                                </SheetClose>

                                <SheetClose asChild>
                                    <Link
                                        href={namedRoute('storefront.register', organization.slug)}
                                        className={menuLinkClassName(true)}
                                    >
                                        <UserPlus className="size-4" />
                                        Registro
                                    </Link>
                                </SheetClose>
                            </>
                        )}
                    </nav>

                    <div className="mt-auto space-y-3">
                        <Separator />
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                Apariencia
                            </p>
                            <div className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => updateAppearance('light')}
                                    className={cn(
                                        'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        !isDark
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Sun className="size-4" />
                                    Claro
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateAppearance('dark')}
                                    className={cn(
                                        'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isDark
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Moon className="size-4" />
                                    Oscuro
                                </button>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
