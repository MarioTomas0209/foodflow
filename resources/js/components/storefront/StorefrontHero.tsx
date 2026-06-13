import { Bike } from 'lucide-react';

import { cn } from '@/lib/utils';
import { type PublicOrganization } from '@/types';

function getOrganizationInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
}

interface StorefrontHeroProps {
    organization: PublicOrganization;
}

export function StorefrontHero({ organization }: StorefrontHeroProps) {
    const isOpenNow = organization.is_open_now ?? true;

    return (
        <section className="relative overflow-hidden rounded-2xl">
            <div className="from-muted via-muted/80 to-foreground/90 relative aspect-[16/10] w-full bg-gradient-to-b sm:aspect-[16/9]">
                {organization.logo ? (
                    <img
                        src={organization.logo}
                        alt={organization.name}
                        className="absolute inset-0 m-auto max-h-[55%] max-w-[75%] object-contain"
                    />
                ) : (
                    <span className="text-foreground/15 absolute inset-0 flex items-center justify-center text-7xl font-black tracking-tight sm:text-8xl">
                        {getOrganizationInitials(organization.name)}
                    </span>
                )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                <span
                    className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase',
                        isOpenNow
                            ? 'bg-green-600 text-white'
                            : 'bg-red-500 text-white',
                    )}
                >
                    {isOpenNow ? 'Abierto' : 'Cerrado'}
                </span>
                {organization.has_delivery && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold tracking-wide text-gray-800 uppercase">
                        <Bike className="size-3.5" />
                        Domicilio
                    </span>
                )}
            </div>

            <div className="absolute right-0 bottom-0 left-0 p-4">
                <h2 className="text-xl font-bold text-white sm:text-2xl">{organization.name}</h2>
                {organization.description && (
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/85">
                        {organization.description}
                    </p>
                )}
            </div>
        </section>
    );
}
