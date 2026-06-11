import { ImagePlus, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useMemo, useRef } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ProductVariantInput } from '@/hooks/use-product-form';
import { cn } from '@/lib/utils';

interface ProductFormDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    onOpenChange: (open: boolean) => void;
    categoryName?: string;
    data: {
        name: string;
        description: string;
        price: string;
        stock: string;
        has_variants: boolean;
        variants: ProductVariantInput[];
        image: File | null;
    };
    currentImageUrl: string | null;
    setData: (key: 'name' | 'description' | 'price' | 'stock', value: string) => void;
    onImageChange: (file: File | null) => void;
    processing: boolean;
    errors: Partial<
        Record<'name' | 'description' | 'price' | 'stock' | 'category_id' | 'variants' | 'image', string>
    >;
    variantError: string | null;
    onSetHasVariants: (hasVariants: boolean) => void;
    onAddVariant: () => void;
    onRemoveVariant: (index: number) => void;
    onUpdateVariant: (index: number, field: keyof ProductVariantInput, value: string) => void;
    onSubmit: FormEventHandler;
    onClose: () => void;
}

export function ProductFormDialog({
    open,
    mode,
    onOpenChange,
    categoryName,
    data,
    currentImageUrl,
    setData,
    onImageChange,
    processing,
    errors,
    variantError,
    onSetHasVariants,
    onAddVariant,
    onRemoveVariant,
    onUpdateVariant,
    onSubmit,
    onClose,
}: ProductFormDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEdit = mode === 'edit';
    const hiddenServerError =
        !data.has_variants && errors.variants ? errors.variants : null;

    const imagePreview = useMemo(() => {
        if (data.image) {
            return URL.createObjectURL(data.image);
        }

        return currentImageUrl ?? null;
    }, [data.image, currentImageUrl]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Actualiza la información del producto.'
                            : categoryName
                              ? `Agrega un producto a "${categoryName}".`
                              : 'Agrega un producto a tu menú.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label>Imagen del producto</Label>
                        <div className="flex items-center gap-4">
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Vista previa"
                                    className="size-20 rounded-xl border object-cover"
                                />
                            ) : (
                                <div className="bg-muted text-muted-foreground flex size-20 items-center justify-center rounded-xl border">
                                    <ImagePlus className="size-8" strokeWidth={1.5} />
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
                                    disabled={processing}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={processing}
                                >
                                    {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                                </Button>
                                <p className="text-muted-foreground text-xs">JPG, PNG o WebP. Máx 2 MB.</p>
                            </div>
                        </div>
                        <InputError message={errors.image} />
                    </div>

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
                        <Label>Tipo de precio</Label>
                        <div className="bg-muted flex gap-1 rounded-lg p-1">
                            <Button
                                type="button"
                                variant={data.has_variants ? 'ghost' : 'default'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onSetHasVariants(false)}
                                disabled={processing}
                            >
                                Precio fijo
                            </Button>
                            <Button
                                type="button"
                                variant={data.has_variants ? 'default' : 'ghost'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onSetHasVariants(true)}
                                disabled={processing}
                            >
                                Con variantes
                            </Button>
                        </div>
                    </div>

                    {!data.has_variants ? (
                        <>
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
                                <InputError message={errors.price ?? hiddenServerError ?? undefined} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="product-stock">Stock</Label>
                                <Input
                                    id="product-stock"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={data.stock}
                                    onChange={(e) => setData('stock', e.target.value)}
                                    disabled={processing}
                                    placeholder="Sin límite"
                                />
                                <p className="text-muted-foreground text-sm">
                                    Deja vacío si el producto no tiene límite de cantidad.
                                </p>
                                <InputError message={errors.stock} />
                            </div>
                        </>
                    ) : (
                        <div className="grid gap-3">
                            <Label>Variantes</Label>
                            <div className="flex flex-col gap-2">
                                <div className="text-muted-foreground hidden gap-2 px-0 text-xs font-medium sm:grid sm:grid-cols-[1fr_1fr_1fr_auto]">
                                    <span>Nombre</span>
                                    <span>Precio</span>
                                    <span>Stock</span>
                                    <span className="sr-only">Acciones</span>
                                </div>
                                {data.variants.map((variant, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <div className="grid flex-1 gap-2 sm:grid-cols-3">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor={`variant-name-${index}`} className="sm:sr-only">
                                                    Nombre de la variante
                                                </Label>
                                                <Input
                                                    id={`variant-name-${index}`}
                                                    value={variant.name}
                                                    onChange={(e) => onUpdateVariant(index, 'name', e.target.value)}
                                                    disabled={processing}
                                                    placeholder="Ej. Chico"
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor={`variant-price-${index}`} className="sm:sr-only">
                                                    Precio de la variante
                                                </Label>
                                                <Input
                                                    id={`variant-price-${index}`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={variant.price}
                                                    onChange={(e) => onUpdateVariant(index, 'price', e.target.value)}
                                                    disabled={processing}
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor={`variant-stock-${index}`} className="sm:sr-only">
                                                    Stock de la variante
                                                </Label>
                                                <Input
                                                    id={`variant-stock-${index}`}
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={variant.stock}
                                                    onChange={(e) => onUpdateVariant(index, 'stock', e.target.value)}
                                                    disabled={processing}
                                                    placeholder="Sin límite"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className={cn('shrink-0', data.variants.length === 1 && 'invisible')}
                                            onClick={() => onRemoveVariant(index)}
                                            disabled={processing || data.variants.length === 1}
                                            aria-label="Eliminar variante"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={onAddVariant} disabled={processing}>
                                <Plus className="size-4" />
                                Agregar variante
                            </Button>
                            <p className="text-muted-foreground text-sm">
                                Deja el stock vacío en cada variante si no tiene límite de cantidad.
                            </p>
                            <InputError message={variantError ?? errors.variants} />
                        </div>
                    )}

                    <InputError message={errors.category_id} />

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {isEdit ? 'Guardar cambios' : 'Crear producto'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
