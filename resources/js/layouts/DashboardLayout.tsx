import { usePage } from '@inertiajs/react';

import { type SharedData } from '@/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { currentOrganization } = usePage<SharedData>().props;

    return (
        <div className="bg-background flex min-h-screen">
            <aside className="border-border bg-muted/40 hidden w-64 shrink-0 border-r p-6 md:block">
                <div className="flex items-center gap-3">
                    {currentOrganization?.logo ? (
                        <img src={currentOrganization.logo} alt={currentOrganization.name} className="size-8 rounded-md object-cover" />
                    ) : (
                        <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md text-sm font-semibold">
                            {currentOrganization?.name?.charAt(0) ?? '?'}
                        </div>
                    )}
                    <span className="truncate font-semibold">{currentOrganization?.name ?? 'Mi negocio'}</span>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="border-border border-b p-4 md:hidden">
                    <span className="font-semibold">{currentOrganization?.name ?? 'Mi negocio'}</span>
                </header>
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
