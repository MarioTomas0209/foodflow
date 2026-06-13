import { Head, router, useForm } from '@inertiajs/react';
import { LoaderCircle, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/format-currency';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type DeliveryZone } from '@/types';

interface DeliveryZonesIndexProps {
    zones: DeliveryZone[];
}

type ZoneFormData = {
    name: string;
    description: string;
    fee: string;
    center_lat: string;
    center_lng: string;
    radius_km: string;
    is_active: boolean;
};

const emptyForm: ZoneFormData = {
    name: '',
    description: '',
    fee: '',
    center_lat: '',
    center_lng: '',
    radius_km: '',
    is_active: true,
};

export default function Index({ zones }: DeliveryZonesIndexProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<ZoneFormData>(emptyForm);

    useEffect(() => {
        if (editingZone) {
            setData({
                name: editingZone.name,
                description: editingZone.description ?? '',
                fee: editingZone.fee,
                center_lat: editingZone.center_lat,
                center_lng: editingZone.center_lng,
                radius_km: editingZone.radius_km,
                is_active: editingZone.is_active,
            });
        } else {
            reset();
        }
        clearErrors();
    }, [editingZone, setData, reset, clearErrors]);

    const openCreate = () => {
        setEditingZone(null);
        setDialogOpen(true);
    };

    const openEdit = (zone: DeliveryZone) => {
        setEditingZone(zone);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingZone(null);
        reset();
        clearErrors();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (editingZone) {
            put(route('dashboard.delivery-zones.update', editingZone.id), {
                preserveScroll: true,
                onSuccess: closeDialog,
            });
            return;
        }

        post(route('dashboard.delivery-zones.store'), {
            preserveScroll: true,
            onSuccess: closeDialog,
        });
    };

    const destroy = (zone: DeliveryZone) => {
        if (!window.confirm(`¿Eliminar la zona "${zone.name}"?`)) {
            return;
        }

        router.delete(route('dashboard.delivery-zones.destroy', zone.id), {
            preserveScroll: true,
        });
    };

    return (
        <DashboardLayout>
            <Head title="Zonas de entrega" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Zonas de entrega</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Define áreas de cobertura con un punto central, radio y costo de envío.
                        </p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="size-4" />
                        Nueva zona
                    </Button>
                </div>

                {zones.length === 0 ? (
                    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
                        <MapPin className="text-muted-foreground size-10" strokeWidth={1.5} />
                        <div>
                            <p className="font-medium">No hay zonas configuradas</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Crea tu primera zona para calcular el costo de envío en checkout.
                            </p>
                        </div>
                        <Button variant="outline" onClick={openCreate}>
                            Crear zona
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {zones.map((zone) => (
                            <div key={zone.id} className="border-border rounded-xl border p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-semibold">{zone.name}</h2>
                                            <span
                                                className={
                                                    zone.is_active
                                                        ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium'
                                                }
                                            >
                                                {zone.is_active ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>
                                        {zone.description && (
                                            <p className="text-muted-foreground text-sm leading-relaxed">{zone.description}</p>
                                        )}
                                        <p className="text-muted-foreground text-sm">
                                            Envío: {formatCurrency(zone.fee)} · Radio: {zone.radius_km} km
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            Centro: {zone.center_lat}, {zone.center_lng}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <Button variant="outline" size="icon" onClick={() => openEdit(zone)} aria-label="Editar zona">
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => destroy(zone)}
                                            aria-label="Eliminar zona"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingZone ? 'Editar zona' : 'Nueva zona de entrega'}</DialogTitle>
                        <DialogDescription>
                            El cliente cae en la zona si su ubicación GPS está dentro del radio definido.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="zone-name">Nombre</Label>
                            <Input
                                id="zone-name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                disabled={processing}
                                placeholder="Zona Centro"
                                required
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="zone-description">Descripción (opcional)</Label>
                            <FormTextarea
                                id="zone-description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                disabled={processing}
                                placeholder="Ej: Cubre barrios cerca de la UNACH, Plaza las Flores y colonias de esa salida."
                                rows={3}
                            />
                            <p className="text-muted-foreground text-xs">
                                Texto orientativo para el cliente. Usa un nombre corto arriba y los detalles aquí.
                            </p>
                            <InputError message={errors.description} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="zone-fee">Costo de envío (MXN)</Label>
                            <Input
                                id="zone-fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.fee}
                                onChange={(e) => setData('fee', e.target.value)}
                                disabled={processing}
                                required
                            />
                            <InputError message={errors.fee} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="zone-lat">Latitud central</Label>
                                <Input
                                    id="zone-lat"
                                    type="number"
                                    step="any"
                                    value={data.center_lat}
                                    onChange={(e) => setData('center_lat', e.target.value)}
                                    disabled={processing}
                                    placeholder="16.2520"
                                    required
                                />
                                <InputError message={errors.center_lat} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="zone-lng">Longitud central</Label>
                                <Input
                                    id="zone-lng"
                                    type="number"
                                    step="any"
                                    value={data.center_lng}
                                    onChange={(e) => setData('center_lng', e.target.value)}
                                    disabled={processing}
                                    placeholder="-92.1350"
                                    required
                                />
                                <InputError message={errors.center_lng} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="zone-radius">Radio (km)</Label>
                            <Input
                                id="zone-radius"
                                type="number"
                                min="0.1"
                                max="50"
                                step="0.1"
                                value={data.radius_km}
                                onChange={(e) => setData('radius_km', e.target.value)}
                                disabled={processing}
                                required
                            />
                            <InputError message={errors.radius_km} />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                disabled={processing}
                                className="size-4 rounded border"
                            />
                            Zona activa
                        </label>
                        <InputError message={errors.is_active} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog} disabled={processing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <LoaderCircle className="size-4 animate-spin" />}
                                {editingZone ? 'Guardar cambios' : 'Crear zona'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
