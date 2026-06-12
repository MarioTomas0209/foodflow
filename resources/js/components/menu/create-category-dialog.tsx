import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type CategoryFormData } from '@/hooks/use-category-form';
import { DAY_NAMES, WEEKDAY_DISPLAY_ORDER } from '@/lib/business-hours';
import { type CategoryScheduleType } from '@/types';

interface CreateCategoryDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    onOpenChange: (open: boolean) => void;
    data: CategoryFormData;
    setData: <K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) => void;
    toggleDay: (day: number, checked: boolean) => void;
    processing: boolean;
    errors: Partial<Record<string, string>>;
    onSubmit: FormEventHandler;
}

export function CreateCategoryDialog({
    open,
    mode,
    onOpenChange,
    data,
    setData,
    toggleDay,
    processing,
    errors,
    onSubmit,
}: CreateCategoryDialogProps) {
    const isEdit = mode === 'edit';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Actualiza los datos y el horario de disponibilidad de la categoría.'
                            : 'Organiza tu menú agrupando productos en categorías.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder="Desayunos"
                            required
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Descripción</Label>
                        <FormTextarea
                            id="description"
                            rows={3}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            disabled={processing}
                            placeholder="Opcional"
                        />
                        <InputError message={errors.description} />
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', checked === true)}
                            disabled={processing}
                        />
                        Categoría activa
                    </label>

                    <div className="border-border space-y-4 rounded-xl border p-4">
                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                                checked={data.has_schedule}
                                onCheckedChange={(checked) => setData('has_schedule', checked === true)}
                                disabled={processing}
                            />
                            Configurar horario
                        </label>

                        {data.has_schedule && (
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="schedule_type">Tipo de horario</Label>
                                    <Select
                                        value={data.schedule_type}
                                        onValueChange={(value) => setData('schedule_type', value as CategoryScheduleType)}
                                        disabled={processing}
                                    >
                                        <SelectTrigger id="schedule_type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="informative">
                                                Informativo — pedido anticipado, siempre se puede ordenar
                                            </SelectItem>
                                            <SelectItem value="restricted">
                                                Restringido — solo se puede pedir en horario
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.schedule_type} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="available_from">Desde</Label>
                                        <Input
                                            id="available_from"
                                            type="time"
                                            value={data.available_from}
                                            onChange={(e) => setData('available_from', e.target.value)}
                                            disabled={processing}
                                            required
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
                                            required
                                        />
                                        <InputError message={errors.available_until} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Días disponibles</Label>
                                    <div className="flex flex-wrap gap-3">
                                        {WEEKDAY_DISPLAY_ORDER.map((day) => (
                                            <label key={day} className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={data.available_days.includes(day)}
                                                    onCheckedChange={(checked) => toggleDay(day, checked === true)}
                                                    disabled={processing}
                                                />
                                                {DAY_NAMES[day]}
                                            </label>
                                        ))}
                                    </div>
                                    <InputError message={errors.available_days} />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {isEdit ? 'Guardar cambios' : 'Crear categoría'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
