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

    const handleLogout = () => {
        router.post(namedRoute('storefront.logout', organization.slug));
    };

    return (
        <div className="bg-background flex min-h-screen flex-col">
            <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
                <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
                    <Link href={namedRoute('storefront.show', organization.slug)} className="flex min-w-0 flex-1 items-center gap-3">
                        {organization.logo ? (
                            <img
                                src={organization.logo}
                                alt={organization.name}
                                className="size-11 shrink-0 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-semibold">
                                {organization.name.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-lg font-semibold">{organization.name}</h1>
                            {location && <p className="text-muted-foreground truncate text-sm">{location}</p>}
                        </div>
                    </Link>

                    <div className="flex shrink-0 items-center gap-2">
                        {customer ? (
                            <>
                                <span className="text-muted-foreground hidden text-sm sm:inline">
                                    Hola, {customer.name.split(' ')[0]}
                                </span>
                                <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
                                    Cerrar sesión
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={namedRoute('storefront.login', organization.slug)}>Iniciar sesión</Link>
                                </Button>
                                <Button size="sm" asChild>
                                    <Link href={namedRoute('storefront.register', organization.slug)}>Registrarse</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
        </div>
    );
}
