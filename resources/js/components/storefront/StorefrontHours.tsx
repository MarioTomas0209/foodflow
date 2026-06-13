import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DAY_NAMES, formatHoursRange } from '@/lib/business-hours';
import { cn } from '@/lib/utils';
import { type OrganizationHour } from '@/types';

interface StorefrontHoursProps {
    hours: OrganizationHour[];
    isOpenNow: boolean;
}

export function StorefrontHours({ hours }: StorefrontHoursProps) {
    const [open, setOpen] = useState(false);

    if (hours.length === 0) {
        return null;
    }

    const sortedHours = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 text-sm font-medium transition-colors">
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
    );
}
