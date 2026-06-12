import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DAY_NAMES, formatHoursRange } from '@/lib/business-hours';
import { cn } from '@/lib/utils';
import { type OrganizationHour } from '@/types';

interface StorefrontHoursProps {
    hours: OrganizationHour[];
    isOpenNow: boolean;
}

export function StorefrontHours({ hours, isOpenNow }: StorefrontHoursProps) {
    const [open, setOpen] = useState(false);

    if (hours.length === 0) {
        return null;
    }

    const sortedHours = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Badge
                    className={cn(
                        'rounded-full px-3 py-1 text-sm font-medium',
                        isOpenNow
                            ? 'border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
                            : 'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
                    )}
                >
                    {isOpenNow ? 'Abierto' : 'Cerrado'}
                </Badge>
                <span className="text-muted-foreground text-sm">
                    {isOpenNow ? 'Estamos recibiendo pedidos ahora.' : 'Por ahora no estamos recibiendo pedidos.'}
                </span>
            </div>

            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger className="text-primary flex items-center gap-1 text-sm font-medium hover:underline">
                    Ver horarios de la semana
                    <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                    <ul className="border-border divide-border divide-y rounded-xl border text-sm">
                        {sortedHours.map((hour) => (
                            <li
                                key={hour.day_of_week}
                                className="flex items-center justify-between gap-4 px-4 py-2.5"
                            >
                                <span className="font-medium">{DAY_NAMES[hour.day_of_week]}</span>
                                <span className={cn(hour.is_closed && 'text-muted-foreground')}>
                                    {formatHoursRange(hour)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CollapsibleContent>
            </Collapsible>
        </section>
    );
}
