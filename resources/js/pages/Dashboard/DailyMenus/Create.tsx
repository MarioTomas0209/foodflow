import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import {
    DailyMenuForm,
    emptyDailyMenuItem,
    type DailyMenuFormData,
} from '@/components/dashboard/daily-menu-form';
import DashboardLayout from '@/layouts/DashboardLayout';

interface CreateProps {
    defaultDate: string;
}

function buildInitialForm(defaultDate: string): DailyMenuFormData {
    return {
        date: defaultDate,
        name: '',
        available_from: '13:00',
        available_until: '17:00',
        is_active: true,
        has_schedule: false,
        items: [emptyDailyMenuItem()],
    };
}

export default function Create({ defaultDate }: CreateProps) {
    const { data, setData, post, processing, errors, transform } = useForm<DailyMenuFormData>(
        buildInitialForm(defaultDate),
    );

    transform((formData) => ({
        date: formData.date,
        name: formData.name || null,
        is_active: formData.is_active,
        available_from: formData.has_schedule ? formData.available_from : null,
        available_until: formData.has_schedule ? formData.available_until : null,
        items: formData.items.map((item, index) => ({
            ...item,
            has_variants: item.has_variants,
            description: item.description || null,
            price: item.has_variants ? '0' : item.price,
            stock: item.has_variants || item.stock === '' ? null : item.stock,
            variants: item.has_variants
                ? item.variants.map((variant) => ({
                      name: variant.name,
                      price: variant.price,
                      stock: variant.stock === '' ? null : variant.stock,
                  }))
                : [],
            sort_order: index,
        })),
    }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('dashboard.daily-menus.store'), {
            forceFormData: true,
        });
    };

    return (
        <DashboardLayout>
            <Head title="Nuevo menú del día" />

            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold">Nuevo menú del día</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Crea el menú especial para una fecha específica.
                    </p>
                </div>

                <DailyMenuForm
                    data={data}
                    setData={setData}
                    processing={processing}
                    errors={errors}
                    onSubmit={submit}
                    submitLabel="Crear menú"
                    onCancel={() => router.visit(route('dashboard.daily-menus.index'))}
                />
            </div>
        </DashboardLayout>
    );
}
