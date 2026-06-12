import { Link, router, usePage } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { useNamedRoute } from '@/lib/ziggy';
import { type PublicOrganization, type SharedData } from '@/types';

interface PublicLayoutProps {
    organization: PublicOrganization;
    children: React.ReactNode;
}

export default function PublicLayout({ organization, children }: PublicLayoutProps) {
    const { customer } = usePage<SharedData>().props;
    const namedRoute = useNamedRoute();
    const location = [organization.address, organization.city].filter(Boolean).join(', ');
    const customerFirstName = customer?.name.split(' ')[0];

    const handleLogout = () => {
        router.post(namedRoute('storefront.logout', organization.slug));
    };

    return (
        <div className="bg-background flex min-h-screen flex-col">
            <header
                id="public-storefront-header"
                className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur"
            >
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4">
                    <Link
                        href={namedRoute('storefront.show', organization.slug)}
                        className="flex min-w-0 items-center gap-3 sm:flex-1"
                    >
                        {organization.logo ? (
                            <div className="bg-muted/50 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border p-1">
                                <img
                                    src={organization.logo}
                                    alt={organization.name}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-semibold">
                                {organization.name.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base leading-snug font-semibold sm:text-lg">{organization.name}</h1>
                            {location && (
                                <p className="text-muted-foreground line-clamp-2 text-xs sm:line-clamp-1 sm:text-sm">
                                    {location}
                                </p>
                            )}
                        </div>
                    </Link>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:items-end">
                        {customer && (
                            <p className="text-muted-foreground text-sm">
                                Hola, <span className="text-foreground font-medium">{customerFirstName}</span>
                            </p>
                        )}

                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                            {customer ? (
                                <>
                                    <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                        <Link href={namedRoute('storefront.orders.index', organization.slug)}>
                                            Mis pedidos
                                        </Link>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={handleLogout}
                                    >
                                        Cerrar sesión
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                        <Link href={namedRoute('storefront.login', organization.slug)}>
                                            Iniciar sesión
                                        </Link>
                                    </Button>
                                    <Button size="sm" className="w-full sm:w-auto" asChild>
                                        <Link href={namedRoute('storefront.register', organization.slug)}>
                                            Registrarse
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
        </div>
    );
}
