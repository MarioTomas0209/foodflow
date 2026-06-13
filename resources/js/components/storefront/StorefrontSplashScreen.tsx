import { useEffect, useState } from 'react';

import { isPwaStandalone } from '@/lib/pwa';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type PublicOrganization } from '@/types';

interface StorefrontSplashScreenProps {
    organization: PublicOrganization;
}

function getOrganizationInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
}

export function StorefrontSplashScreen({ organization }: StorefrontSplashScreenProps) {
    const [phase, setPhase] = useState<'hidden' | 'show' | 'fade'>('hidden');

    useEffect(() => {
        if (!isPwaStandalone()) {
            return;
        }

        const storageKey = `storefront-splash:${organization.slug}`;

        if (sessionStorage.getItem(storageKey) === '1') {
            return;
        }

        sessionStorage.setItem(storageKey, '1');
        setPhase('show');

        const fadeTimeout = window.setTimeout(() => setPhase('fade'), 900);
        const hideTimeout = window.setTimeout(() => setPhase('hidden'), 1400);

        return () => {
            window.clearTimeout(fadeTimeout);
            window.clearTimeout(hideTimeout);
        };
    }, [organization.slug]);

    if (phase === 'hidden') {
        return null;
    }

    return (
        <div
            className={cn(
                'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-8 text-center transition-opacity duration-500 dark:bg-zinc-950',
                phase === 'show' ? 'opacity-100' : 'opacity-0',
            )}
        >
            <div
                className={cn(
                    'mb-6 flex size-28 items-center justify-center rounded-full shadow-lg',
                    storefrontAccent.pillMuted,
                )}
            >
                {organization.logo ? (
                    <img
                        src={organization.logo}
                        alt={organization.name}
                        className="size-20 rounded-full object-contain"
                    />
                ) : (
                    <span className={cn('text-3xl font-bold', storefrontAccent.text)}>
                        {getOrganizationInitials(organization.name)}
                    </span>
                )}
            </div>

            <h2 className="text-2xl font-bold tracking-tight">{organization.name}</h2>
            <p className="text-muted-foreground mt-2 text-sm">Pedidos en línea</p>
        </div>
    );
}
