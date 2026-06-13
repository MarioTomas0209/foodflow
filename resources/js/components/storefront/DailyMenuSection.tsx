import { Clock, Sparkles } from 'lucide-react';

import { DailyMenuItemCard } from '@/components/storefront/DailyMenuItemCard';
import {
    formatDailyMenuDate,
    formatDailyMenuTimeRange,
    formatDailyMenuTitle,
} from '@/lib/daily-menu';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type CartableProduct, type CartableVariant, type CartSource, type DailyMenu } from '@/types';

interface DailyMenuSectionProps {
    dailyMenu: DailyMenu;
    getQuantityInCart: (productId: string, variantId: string | null, source?: CartSource) => number;
    onAdd: (product: CartableProduct, variant?: CartableVariant) => boolean;
}

export function DailyMenuSection({ dailyMenu, getQuantityInCart, onAdd }: DailyMenuSectionProps) {
    const timeRange = formatDailyMenuTimeRange(dailyMenu);
    const title = formatDailyMenuTitle(dailyMenu);

    return (
        <section id="daily-menu" className="scroll-mt-40 space-y-4">
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase', storefrontAccent.pill)}>
                        <Sparkles className="size-3.5" />
                        Menú del día
                    </span>
                    <span className="text-muted-foreground text-xs font-medium capitalize">
                        {formatDailyMenuDate(dailyMenu.date)}
                    </span>
                    {timeRange && (
                        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium">
                            <Clock className="size-3.5" />
                            {timeRange}
                        </span>
                    )}
                    {!dailyMenu.can_order_now && timeRange && (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Fuera de horario
                        </span>
                    )}
                    {dailyMenu.can_order_now && !dailyMenu.is_available_now && timeRange && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                            Pedido anticipado
                        </span>
                    )}
                </div>

                <div>
                    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Platillos especiales disponibles solo hoy.</p>
                </div>
            </div>

            <ul className={cn('space-y-3')}>
                {dailyMenu.items.map((item) => (
                    <li key={item.id}>
                        <DailyMenuItemCard
                            item={item}
                            menuAvailable={dailyMenu.can_order_now}
                            getQuantityInCart={getQuantityInCart}
                            onAdd={onAdd}
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}
