import { MapPin, Phone, Truck } from 'lucide-react';

import { getTodayHoursSummary } from '@/lib/business-hours';
import { buildMapsSearchUrl } from '@/lib/maps';
import { buildWhatsAppContactUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { type PublicOrganization } from '@/types';

interface StorefrontQuickInfoProps {
    organization: PublicOrganization;
}

function formatPhoneDisplay(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.length >= 10) {
        return `${digits.slice(-10, -6)} ${digits.slice(-6, -4)} ${digits.slice(-4)}`.trim();
    }

    return phone;
}

function formatLocationLine(organization: PublicOrganization): string | null {
    const parts = [organization.address?.trim(), organization.city?.trim()].filter(Boolean) as string[];

    return parts.length > 0 ? parts.join(', ') : null;
}

export function StorefrontQuickInfo({ organization }: StorefrontQuickInfoProps) {
    const deliveryLabel = organization.has_delivery ? 'Recoge y a domicilio' : 'Recoge en local';
    const locationLine = formatLocationLine(organization);
    const hoursLabel =
        organization.hours && organization.hours.length > 0
            ? getTodayHoursSummary(organization.hours)
            : null;

    const items = [
        {
            icon: Truck,
            label: 'Entrega',
            value: deliveryLabel,
            href: null as string | null,
        },
        // ...(hoursLabel
        //     ? [
        //           {
        //               icon: Clock,
        //               label: 'Horario',
        //               value: hoursLabel,
        //               href: null as string | null,
        //           },
        //       ]
        //     : []),
        ...(organization.phone
            ? [
                  {
                      icon: Phone,
                      label: 'WhatsApp',
                      value: formatPhoneDisplay(organization.phone),
                      href: buildWhatsAppContactUrl(organization.phone),
                      external: true,
                  },
              ]
            : []),
    ];

    if (items.length === 0 && !locationLine) {
        return null;
    }

    return (
        <section className="space-y-2">
            {locationLine && (
                <a
                    href={buildMapsSearchUrl(locationLine)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border bg-card hover:bg-muted/50 flex gap-3 rounded-xl border px-3 py-3 transition-colors"
                >
                    <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 text-left">
                        <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                            Ubicación
                        </p>
                        <p className="text-sm leading-snug font-semibold">{locationLine}</p>
                    </div>
                </a>
            )}

            {items.length > 0 && (
                <div
                    className={cn(
                        'grid gap-2',
                        items.length === 1 && 'grid-cols-1',
                        items.length === 2 && 'grid-cols-2',
                        items.length >= 3 && 'grid-cols-3',
                    )}
                >
                    {items.map((item) => {
                        const Icon = item.icon;
                        const content = (
                            <>
                                <div className="flex items-center gap-2">
                                    <Icon className="text-muted-foreground size-4" />
                                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                                        {item.label}
                                    </p>
                                </div>
                                <p className="text-[12px] leading-tight mt-1 font-bold">{item.value}</p>
                            </>
                        );

                        if (item.href) {
                            return (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    {...('external' in item && item.external
                                        ? { target: '_blank', rel: 'noopener noreferrer' }
                                        : {})}
                                    className="border-border bg-card hover:bg-muted/50 rounded-xl border px-2 py-3 text-center transition-colors"
                                >
                                    {content}
                                </a>
                            );
                        }

                        return (
                            <div
                                key={item.label}
                                className="border-border bg-card rounded-xl border px-2 py-3 text-center"
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
