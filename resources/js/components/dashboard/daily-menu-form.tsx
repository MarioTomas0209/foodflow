import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface DailyMenuItemVariantInput {
    name: string;
    price: string;
    stock: string;
}

export interface DailyMenuItemFormRow {
    id?: string;
    name: string;
    description: string;
    has_variants: boolean;
    price: string;
    stock: string;
    variants: DailyMenuItemVariantInput[];
    image: File | null;
    remove_image: boolean;
    current_image_url: string | null;
}

export interface DailyMenuFormData {
    date: string;
    name: string;
    available_from: string;
    available_until: string;
    is_active: boolean;
    has_schedule: boolean;
    items: DailyMenuItemFormRow[];
    [key: string]: string | boolean | DailyMenuItemFormRow[] | null;
}

export const emptyDailyMenuVariant = (): DailyMenuItemVariantInput => ({
    name: '',
    price: '',
    stock: '',
});

export const emptyDailyMenuItem = (): DailyMenuItemFormRow => ({
    name: '',
    description: '',
    has_variants: false,
    price: '',
    stock: '',
    variants: [
        { name: 'Orden', price: '', stock: '' },
        { name: 'Media', price: '', stock: '' },
    ],
    image: null,
    remove_image: false,
    current_image_url: null,
});

interface DailyMenuFormProps {
    data: DailyMenuFormData;
    setData: <K extends keyof DailyMenuFormData>(key: K, value: DailyMenuFormData[K]) => void;
    processing: boolean;
    errors: Partial<Record<string, string>>;
    onSubmit: FormEventHandler;
    submitLabel: string;
    onCancel: () => void;
}

export function DailyMenuForm({
    data,
    setData,
    processing,
    errors,
    onSubmit,
    submitLabel,
    onCancel,
}: DailyMenuFormProps) {
    const updateItem = (index: number, patch: Partial<DailyMenuItemFormRow>) => {
        setData(
            'items',
            data.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
        );
    };

    const addItem = () => {
        setData('items', [...data.items, emptyDailyMenuItem()]);
    };

    const removeItem = (index: number) => {
        setData(
            'items',
            data.items.filter((_, itemIndex) => itemIndex !== index),
        );
    };

    const setItemHasVariants = (index: number, hasVariants: boolean) => {
        const item = data.items[index];

        updateItem(index, {
            has_variants: hasVariants,
            variants:
                hasVariants && item.variants.length === 0
                    ? [
                          { name: 'Orden', price: '', stock: '' },
                          { name: 'Media', price: '', stock: '' },
                      ]
                    : item.variants,
        });
    };

    const updateVariant = (
        itemIndex: number,
        variantIndex: number,
        field: keyof DailyMenuItemVariantInput,
        value: string,
    ) => {
        setData(
            'items',
            data.items.map((item, currentItemIndex) => {
                if (currentItemIndex !== itemIndex) {
                    return item;
                }

                return {
                    ...item,
                    variants: item.variants.map((variant, currentVariantIndex) =>
                        currentVariantIndex === variantIndex ? { ...variant, [field]: value } : variant,
                    ),
                };
            }),
        );
    };

    const addVariant = (itemIndex: number) => {
        setData(
            'items',
            data.items.map((item, currentItemIndex) =>
                currentItemIndex === itemIndex
                    ? { ...item, variants: [...item.variants, emptyDailyMenuVariant()] }
                    : item,
            ),
        );
    };

    const removeVariant = (itemIndex: number, variantIndex: number) => {
        setData(
            'items',
            data.items.map((item, currentItemIndex) => {
                if (currentItemIndex !== itemIndex || item.variants.length <= 1) {
                    return item;
                }

                return {
                    ...item,
                    variants: item.variants.filter((_, currentVariantIndex) => currentVariantIndex !== variantIndex),
                };
            }),
        );
    };

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                        id="date"
                        type="date"
                        value={data.date}
                        onChange={(e) => setData('date', e.target.value)}
                        disabled={processing}
                        required
                    />
                    <InputError message={errors.date} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre del menú</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        disabled={processing}
                        placeholder="Comida corrida del lunes"
                    />
                    <InputError message={errors.name} />
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                    checked={data.is_active}
                    onCheckedChange={(checked) => setData('is_active', checked === true)}
                    disabled={processing}
                />
                Menú activo
            </label>

            <div className="border-border space-y-4 rounded-xl border p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                        checked={data.has_schedule}
                        onCheckedChange={(checked) => setData('has_schedule', checked === true)}
                        disabled={processing}
                    />
                    Horario de disponibilidad
                </label>

                {data.has_schedule && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="available_from">Desde</Label>
                            <Input
                                id="available_from"
                                type="time"
                                value={data.available_from}
                                onChange={(e) => setData('available_from', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.available_from} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="available_until">Hasta</Label>
                            <Input
                                id="available_until"
                                type="time"
                                value={data.available_until}
                                onChange={(e) => setData('available_until', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.available_until} />
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="font-semibold">Platillos</h2>
                        <p className="text-muted-foreground text-sm">Agrega los platillos que formarán este menú.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={processing}>
                        <Plus className="size-4" />
                        Agregar platillo
                    </Button>
                </div>

                <InputError message={errors.items} />

                <div className="space-y-4">
                    {data.items.map((item, index) => (
                        <div key={item.id ?? `new-${index}`} className="border-border space-y-4 rounded-xl border p-4">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-sm font-medium">Platillo {index + 1}</h3>
                                {data.items.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive size-8"
                                        onClick={() => removeItem(index)}
                                        disabled={processing}
                                        aria-label="Eliminar platillo"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor={`item-name-${index}`}>Nombre</Label>
                                    <Input
                                        id={`item-name-${index}`}
                                        value={item.name}
                                        onChange={(e) => updateItem(index, { name: e.target.value })}
                                        disabled={processing}
                                        required
                                    />
                                    <InputError message={errors[`items.${index}.name`]} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor={`item-description-${index}`}>Descripción</Label>
                                    <FormTextarea
                                        id={`item-description-${index}`}
                                        rows={2}
                                        value={item.description}
                                        onChange={(e) => updateItem(index, { description: e.target.value })}
                                        disabled={processing}
                                    />
                                    <InputError message={errors[`items.${index}.description`]} />
                                </div>

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>Tipo de precio</Label>
                                    <div className="bg-muted flex gap-1 rounded-lg p-1">
                                        <Button
                                            type="button"
                                            variant={item.has_variants ? 'ghost' : 'default'}
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setItemHasVariants(index, false)}
                                            disabled={processing}
                                        >
                                            Precio fijo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={item.has_variants ? 'default' : 'ghost'}
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setItemHasVariants(index, true)}
                                            disabled={processing}
                                        >
                                            Orden / Media
                                        </Button>
                                    </div>
                                </div>

                                {!item.has_variants ? (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor={`item-price-${index}`}>Precio</Label>
                                            <Input
                                                id={`item-price-${index}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, { price: e.target.value })}
                                                disabled={processing}
                                                required
                                            />
                                            <InputError message={errors[`items.${index}.price`]} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor={`item-stock-${index}`}>Stock</Label>
                                            <Input
                                                id={`item-stock-${index}`}
                                                type="number"
                                                min="0"
                                                value={item.stock}
                                                onChange={(e) => updateItem(index, { stock: e.target.value })}
                                                disabled={processing}
                                                placeholder="Ilimitado"
                                            />
                                            <InputError message={errors[`items.${index}.stock`]} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid gap-3 sm:col-span-2">
                                        <Label>Variantes</Label>
                                        <div className="space-y-2">
                                            {item.variants.map((variant, variantIndex) => (
                                                <div key={variantIndex} className="flex items-start gap-2">
                                                    <div className="grid flex-1 gap-2 sm:grid-cols-3">
                                                        <Input
                                                            value={variant.name}
                                                            onChange={(e) =>
                                                                updateVariant(index, variantIndex, 'name', e.target.value)
                                                            }
                                                            disabled={processing}
                                                            placeholder="Orden"
                                                            required
                                                        />
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={variant.price}
                                                            onChange={(e) =>
                                                                updateVariant(index, variantIndex, 'price', e.target.value)
                                                            }
                                                            disabled={processing}
                                                            placeholder="Precio"
                                                            required
                                                        />
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={variant.stock}
                                                            onChange={(e) =>
                                                                updateVariant(index, variantIndex, 'stock', e.target.value)
                                                            }
                                                            disabled={processing}
                                                            placeholder="Stock"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn('shrink-0', item.variants.length === 1 && 'invisible')}
                                                        onClick={() => removeVariant(index, variantIndex)}
                                                        disabled={processing || item.variants.length === 1}
                                                        aria-label="Eliminar variante"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addVariant(index)}
                                            disabled={processing}
                                        >
                                            <Plus className="size-4" />
                                            Agregar variante
                                        </Button>
                                        <InputError message={errors[`items.${index}.variants`]} />
                                    </div>
                                )}

                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor={`item-image-${index}`}>Imagen</Label>
                                    {item.current_image_url && !item.remove_image && (
                                        <img
                                            src={item.current_image_url}
                                            alt={item.name || `Platillo ${index + 1}`}
                                            className="size-20 rounded-lg object-cover"
                                        />
                                    )}
                                    <Input
                                        id={`item-image-${index}`}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) =>
                                            updateItem(index, {
                                                image: e.target.files?.[0] ?? null,
                                                remove_image: false,
                                            })
                                        }
                                        disabled={processing}
                                    />
                                    {item.current_image_url && (
                                        <label className="flex items-center gap-2 text-sm">
                                            <Checkbox
                                                checked={item.remove_image}
                                                onCheckedChange={(checked) =>
                                                    updateItem(index, {
                                                        remove_image: checked === true,
                                                        image: null,
                                                    })
                                                }
                                                disabled={processing}
                                            />
                                            Quitar imagen actual
                                        </label>
                                    )}
                                    <InputError message={errors[`items.${index}.image`]} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={processing}>
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
