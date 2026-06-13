import { type OrganizationHour } from '@/types';

export const DAY_NAMES = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
] as const;

/** Monday-first display order for settings UI */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** 24-hour HH:mm for `<input type="time">` and API payloads */
export function toTimeInputValue(time: string): string {
    return time.slice(0, 5);
}

export function formatHourLabel(time: string): string {
    const normalized = time.slice(0, 5);
    const [hours, minutes] = normalized.split(':').map(Number);
    const period = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;

    return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatHoursRange(hour: Pick<OrganizationHour, 'opens_at' | 'closes_at' | 'is_closed'>): string {
    if (hour.is_closed) {
        return 'Cerrado';
    }

    return `${formatHourLabel(hour.opens_at)} – ${formatHourLabel(hour.closes_at)}`;
}

export function getTodayHours(hours: OrganizationHour[]): OrganizationHour | undefined {
    const today = new Date().getDay();

    return hours.find((hour) => hour.day_of_week === today);
}

export function getTodayHoursSummary(hours: OrganizationHour[]): string {
    const todayHours = getTodayHours(hours);

    if (!todayHours) {
        return 'Sin horario';
    }

    if (todayHours.is_closed) {
        return 'Cerrado hoy';
    }

    return formatHoursRange(todayHours);
}

export interface BusinessHourFormRow {
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
}

export function buildHoursFormState(hours: OrganizationHour[]): BusinessHourFormRow[] {
    const byDay = new Map(hours.map((hour) => [hour.day_of_week, hour]));

    return Array.from({ length: 7 }, (_, day) => {
        const existing = byDay.get(day);

        return {
            day_of_week: day,
            opens_at: existing ? toTimeInputValue(existing.opens_at) : '08:00',
            closes_at: existing ? toTimeInputValue(existing.closes_at) : '20:00',
            is_closed: existing?.is_closed ?? day === 0,
        };
    });
}
