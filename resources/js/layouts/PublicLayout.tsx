import { Link, usePage } from '@inertiajs/react';

import { PublicHeaderMenu } from '@/components/storefront/PublicHeaderMenu';
import { useNamedRoute } from '@/lib/ziggy';
import { cn } from '@/lib/utils';
import { storefrontAccent } from '@/lib/storefront-theme';
import { type PublicOrganization, type SharedData } from '@/types';

interface PublicLayoutProps {
    organization: PublicOrganization;
    children: React.ReactNode;
    subheader?: React.ReactNode;
    className?: string;
}

function getOrganizationInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
}

export default function PublicLayout({ organization, children, subheader, className }: PublicLayoutProps) {
    const { customer } = usePage<SharedData>().props;
    const namedRoute = useNamedRoute();
    const customerFirstName = customer?.name.split(' ')[0];

    return (
        <div className="bg-background flex min-h-screen flex-col">
            <header
                id="public-storefront-header"
                className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur"
            >
                <div className="mx-auto w-full max-w-2xl px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href={namedRoute('storefront.show', organization.slug)}
                            className="flex min-w-0 flex-1 items-center gap-3"
                        >
                            {organization.logo ? (
                                <div className="bg-muted/50 flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border p-1">
                                    <img
                                        src={organization.logo}
                                        alt={organization.name}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                        'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                                        storefrontAccent.avatar,
                                    )}
                                >
                                    {getOrganizationInitials(organization.name)}
                                </div>
                            )}
                            <h1 className="min-w-0 truncate text-base font-bold">{organization.name}</h1>
                        </Link>

                        <PublicHeaderMenu organization={organization} customerName={customerFirstName} />
                    </div>

                    {subheader}
                </div>
            </header>

            <main className={cn('mx-auto w-full max-w-2xl flex-1 px-4 py-4', className)}>{children}</main>
        </div>
    );
}
