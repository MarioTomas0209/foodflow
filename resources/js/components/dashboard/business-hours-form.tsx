import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    buildHoursFormState,
    DAY_NAMES,
    WEEKDAY_DISPLAY_ORDER,
    type BusinessHourFormRow,
} from '@/lib/business-hours';
import { type OrganizationHour } from '@/types';

interface BusinessHoursFormProps {
    hours: OrganizationHour[];
}

export function BusinessHoursForm({ hours }: BusinessHoursFormProps) {
    const { data, setData, put, processing, errors } = useForm<{ hours: BusinessHourFormRow[] }>({
        hours: buildHoursFormState(hours),
    });

    const updateHour = (dayOfWeek: number, patch: Partial<BusinessHourFormRow>) => {
        setData(
            'hours',
            data.hours.map((hour) => (hour.day_of_week === dayOfWeek ? { ...hour, ...patch } : hour)),
        );
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('dashboard.hours.update'), {
            preserveScroll: true,
        });
    };

    const hourByDay = new Map(data.hours.map((hour) => [hour.day_of_week, hour]));

    return (
        <form onSubmit={submit} className="border-border space-y-4 rounded-xl border p-4">
            <div>
                <h2 className="font-semibold">Horarios de atención</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Define cuándo tu negocio está abierto para recibir pedidos.
                </p>
            </div>

            <div className="divide-border divide-y">
                {WEEKDAY_DISPLAY_ORDER.map((dayOfWeek) => {
                    const hour = hourByDay.get(dayOfWeek);

                    if (!hour) {
                        return null;
                    }

                    const index = data.hours.findIndex((row) => row.day_of_week === dayOfWeek);

                    return (
                        <div
                            key={dayOfWeek}
                            className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-[7rem] font-medium">{DAY_NAMES[dayOfWeek]}</div>

                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={hour.is_closed}
                                    onCheckedChange={(checked) =>
                                        updateHour(dayOfWeek, { is_closed: checked === true })
                                    }
                                    disabled={processing}
                                />
                                Cerrado
                            </label>

                            <div className="flex flex-1 items-center gap-2 sm:justify-end">
                                <Input
                                    type="time"
                                    value={hour.opens_at}
                                    onChange={(e) => updateHour(dayOfWeek, { opens_at: e.target.value })}
                                    disabled={processing || hour.is_closed}
                                    className="w-[7.5rem]"
                                    aria-label={`Apertura ${DAY_NAMES[dayOfWeek]}`}
                                />
                                <span className="text-muted-foreground text-sm">a</span>
                                <Input
                                    type="time"
                                    value={hour.closes_at}
                                    onChange={(e) => updateHour(dayOfWeek, { closes_at: e.target.value })}
                                    disabled={processing || hour.is_closed}
                                    className="w-[7.5rem]"
                                    aria-label={`Cierre ${DAY_NAMES[dayOfWeek]}`}
                                />
                            </div>

                            <InputError message={errors[`hours.${index}.opens_at` as keyof typeof errors]} />
                            <InputError message={errors[`hours.${index}.closes_at` as keyof typeof errors]} />
                        </div>
                    );
                })}
            </div>

            <InputError message={errors.hours} />

            <Button type="submit" variant="outline" disabled={processing}>
                {processing && <LoaderCircle className="size-4 animate-spin" />}
                Guardar horarios
            </Button>
        </form>
    );
}
