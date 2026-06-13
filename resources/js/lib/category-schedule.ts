import { formatHourLabel, DAY_NAMES, WEEKDAY_DISPLAY_ORDER } from '@/lib/business-hours';
import { type Category } from '@/types';

export function formatCategoryAvailabilityMessage(
    category: Pick<Category, 'available_from' | 'available_until'>,
): string | null {
    if (!category.available_from || !category.available_until) {
        return null;
    }

    return `Disponible de ${formatHourLabel(category.available_from)} a ${formatHourLabel(category.available_until)}`;
}

export function formatCategoryTimeRange(
    category: Pick<Category, 'available_from' | 'available_until'>,
): string | null {
    if (!category.available_from || !category.available_until) {
        return null;
    }

    return `${formatHourLabel(category.available_from)} – ${formatHourLabel(category.available_until)}`;
}

export function formatCategoryScheduleDays(days: number[] | null): string | null {
    if (!days || days.length === 0) {
        return null;
    }

    if (days.length === 7) {
        return 'Todos los días';
    }

    const orderedDays = WEEKDAY_DISPLAY_ORDER.filter((day) => days.includes(day));

    return orderedDays.map((day) => DAY_NAMES[day]).join(', ');
}

export function formatCategoryScheduleSummary(
    category: Pick<Category, 'available_from' | 'available_until' | 'available_days'>,
): string | null {
    const parts = [formatCategoryTimeRange(category), formatCategoryScheduleDays(category.available_days)].filter(
        Boolean,
    ) as string[];

    return parts.length > 0 ? parts.join(' · ') : null;
}

export function categoryHasSchedule(
    category: Pick<Category, 'available_from' | 'available_until' | 'available_days'>,
): boolean {
    return (
        category.available_from !== null ||
        category.available_until !== null ||
        (category.available_days !== null && category.available_days.length > 0)
    );
}

export const SCHEDULE_TYPE_LABELS: Record<Category['schedule_type'], string> = {
    informative: 'Informativo',
    restricted: 'Restringido',
};

export function categoryCanOrderNow(category: Pick<Category, 'can_order_now'>): boolean {
    return category.can_order_now;
}

export function shouldShowCategoryScheduleBanner(
    category: Pick<Category, 'available_from' | 'available_until' | 'available_days' | 'is_available_now'>,
): boolean {
    if (!categoryHasSchedule(category) || !formatCategoryAvailabilityMessage(category)) {
        return false;
    }

    return !category.is_available_now;
}

export function isCategoryScheduleBannerWarning(
    category: Pick<Category, 'can_order_now'>,
): boolean {
    return !category.can_order_now;
}

export function isCategoryScheduleBannerAnticipated(
    category: Pick<Category, 'can_order_now' | 'is_available_now'>,
): boolean {
    return category.can_order_now && !category.is_available_now;
}
