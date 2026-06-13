import { Link } from '@inertiajs/react';

import { Label } from '@/components/ui/label';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type PublicOrganization } from '@/types';

const inputClassName = 'rounded-xl';

function getOrganizationInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
}

export function AuthFieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return (
        <Label htmlFor={htmlFor} className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            {children}
        </Label>
    );
}

export { inputClassName };

export function CustomerAuthShell({
    organization,
    title,
    subtitle,
    children,
    footer,
}: {
    organization: PublicOrganization;
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footer: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 pb-8">
            <section className="flex flex-col items-center gap-4 py-2 text-center">
                {organization.logo ? (
                    <div className="bg-muted/50 flex size-20 items-center justify-center overflow-hidden rounded-full border p-2 shadow-sm">
                        <img
                            src={organization.logo}
                            alt={organization.name}
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>
                ) : (
                    <div
                        className={cn(
                            'flex size-20 items-center justify-center rounded-full text-2xl font-bold shadow-sm',
                            storefrontAccent.avatar,
                        )}
                    >
                        {getOrganizationInitials(organization.name)}
                    </div>
                )}

                <div className="space-y-1">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                        {organization.name}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">{subtitle}</p>
                </div>
            </section>

            <section className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-sm">{children}</section>

            <div className="text-center text-sm">{footer}</div>
        </div>
    );
}

export function AuthSwitchLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className={cn('font-semibold transition-opacity hover:opacity-80', storefrontAccent.text)}>
            {children}
        </Link>
    );
}
