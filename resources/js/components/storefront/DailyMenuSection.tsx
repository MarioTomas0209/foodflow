import { Clock, Sparkles } from 'lucide-react';

import { DailyMenuItemCard } from '@/components/storefront/DailyMenuItemCard';
import { Badge } from '@/components/ui/badge';
import {
    formatDailyMenuDate,
    formatDailyMenuTimeRange,
    formatDailyMenuTitle,
} from '@/lib/daily-menu';
import { type DailyMenu } from '@/types';

interface DailyMenuSectionProps {
    dailyMenu: DailyMenu;
}

export function DailyMenuSection({ dailyMenu }: DailyMenuSectionProps) {
    const timeRange = formatDailyMenuTimeRange(dailyMenu);
    const title = formatDailyMenuTitle(dailyMenu);

    return (
        <section
            id="daily-menu"
            className="scroll-mt-44 space-y-4 sm:scroll-mt-[7.5rem]"
        >
            <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-5 shadow-sm dark:border-orange-900/40 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-yellow-950/20">
                <div className="absolute top-0 right-0 size-32 translate-x-8 -translate-y-8 rounded-full bg-orange-200/40 blur-2xl dark:bg-orange-500/10" />

                <div className="relative space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full bg-orange-600 text-white hover:bg-orange-600">
                            <Sparkles className="mr-1 size-3.5" />
                            Menú del día
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                            {formatDailyMenuDate(dailyMenu.date)}
                        </Badge>
                        {timeRange && (
                            <Badge variant="secondary" className="inline-flex items-center gap-1">
                                <Clock className="size-3.5" />
                                {timeRange}
                            </Badge>
                        )}
                        {!dailyMenu.is_available_now && timeRange && (
                            <Badge variant="outline" className="border-amber-300 text-amber-800">
                                Fuera de horario
                            </Badge>
                        )}
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Platillos especiales disponibles solo hoy.
                        </p>
                    </div>
                </div>
            </div>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {dailyMenu.items.map((item) => (
                    <li key={item.id}>
                        <DailyMenuItemCard item={item} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
