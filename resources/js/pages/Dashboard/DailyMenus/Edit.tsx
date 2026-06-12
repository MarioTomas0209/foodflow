import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import {
    DailyMenuForm,
    emptyDailyMenuItem,
    type DailyMenuFormData,
    type DailyMenuItemFormRow,
} from '@/components/dashboard/daily-menu-form';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type DailyMenu, type DailyMenuItem } from '@/types';

interface EditProps {
    dailyMenu: DailyMenu & {
        items: Array<
            DailyMenuItem & {
                description: string;
                price: string;
                stock: string;
                image: string | null;
                variants: Array<{
                    name: string;
                    price: string;
                    stock: string;
                }>;
            }
        >;
    };
}

function buildFormFromMenu(menu: EditProps['dailyMenu']): DailyMenuFormData {
    const hasSchedule = menu.available_from !== null || menu.available_until !== null;

    return {
        date: menu.date,
        name: menu.name ?? '',
        available_from: menu.available_from ? menu.available_from.slice(0, 5) : '13:00',
        available_until: menu.available_until ? menu.available_until.slice(0, 5) : '17:00',
        is_active: menu.is_active ?? true,
        has_schedule: hasSchedule,
        items:
            menu.items.length > 0
                ? menu.items.map(
                      (item): DailyMenuItemFormRow => ({
                          id: item.id,
                          name: item.name,
                          description: item.description,
                          has_variants: item.has_variants,
                          price: item.price,
                          stock: item.stock,
                          variants:
                              item.has_variants && item.variants.length > 0
                                  ? item.variants.map((variant) => ({
                                        name: variant.name,
                                        price: variant.price,
                                        stock: variant.stock,
                                    }))
                                  : [
                                        { name: 'Orden', price: '', stock: '' },
                                        { name: 'Media', price: '', stock: '' },
                                    ],
                          image: null,
                          remove_image: false,
                          current_image_url: item.image,
                      }),
                  )
                : [emptyDailyMenuItem()],
    };
}

export default function Edit({ dailyMenu }: EditProps) {
    const { data, setData, post, processing, errors, transform } = useForm<DailyMenuFormData>(
        buildFormFromMenu(dailyMenu),
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

        post(route('dashboard.daily-menus.update', dailyMenu.id), {
            forceFormData: true,
        });
    };

    return (
        <DashboardLayout>
            <Head title="Editar menú del día" />

            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold">Editar menú del día</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Actualiza los platillos y la disponibilidad de este menú.
                    </p>
                </div>

                <DailyMenuForm
                    data={data}
                    setData={setData}
                    processing={processing}
                    errors={errors}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                    onCancel={() => router.visit(route('dashboard.daily-menus.index'))}
                />
            </div>
        </DashboardLayout>
    );
}
