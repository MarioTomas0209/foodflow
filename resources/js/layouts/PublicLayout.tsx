import { type PublicOrganization } from '@/types';

interface PublicLayoutProps {
    organization: PublicOrganization;
    children: React.ReactNode;
}

export default function PublicLayout({ organization, children }: PublicLayoutProps) {
    const location = [organization.address, organization.city].filter(Boolean).join(', ');

    return (
        <div className="bg-background flex min-h-screen flex-col">
            <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
                <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
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
                </div>
            </header>

            <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
        </div>
    );
}
