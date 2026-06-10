import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryName?: string;
    data: { name: string; description: string; price: string };
    setData: (key: 'name' | 'description' | 'price', value: string) => void;
    processing: boolean;
    errors: Partial<Record<'name' | 'description' | 'price' | 'category_id', string>>;
    onSubmit: FormEventHandler;
    onClose: () => void;
}

export function CreateProductDialog({
    open,
    onOpenChange,
    categoryName,
    data,
    setData,
    processing,
    errors,
    onSubmit,
    onClose,
}: CreateProductDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuevo producto</DialogTitle>
                    <DialogDescription>
                        {categoryName ? `Agrega un producto a "${categoryName}".` : 'Agrega un producto a tu menú.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="product-name">Nombre</Label>
                        <Input
                            id="product-name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder="Taco al pastor"
                            required
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="product-description">Descripción</Label>
                        <FormTextarea
                            id="product-description"
                            rows={3}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            disabled={processing}
                            placeholder="Opcional"
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="product-price">Precio</Label>
                        <Input
                            id="product-price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.price}
                            onChange={(e) => setData('price', e.target.value)}
                            disabled={processing}
                            placeholder="0.00"
                            required
                        />
                        <InputError message={errors.price} />
                    </div>

                    <InputError message={errors.category_id} />

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Crear producto
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
