import { formatHourLabel } from '@/lib/business-hours';
import { type DailyMenu } from '@/types';

export function formatDailyMenuTimeRange(menu: Pick<DailyMenu, 'available_from' | 'available_until'>): string | null {
    if (!menu.available_from || !menu.available_until) {
        return null;
    }

    return `${formatHourLabel(menu.available_from)} – ${formatHourLabel(menu.available_until)}`;
}

export function formatDailyMenuTitle(menu: Pick<DailyMenu, 'name'>): string {
    return menu.name?.trim() || 'Menú del día';
}

export function formatDailyMenuDate(date: string): string {
    return new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(new Date(`${date}T12:00:00`));
}
