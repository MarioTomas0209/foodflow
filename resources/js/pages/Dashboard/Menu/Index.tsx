import { Head, useForm } from '@inertiajs/react';
import { FolderOpen, LoaderCircle, Plus } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/layouts/DashboardLayout';
import { cn } from '@/lib/utils';
import { type Category } from '@/types';

interface MenuPageProps {
    categories: Category[];
}

const formatCurrency = (amount: string | number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(amount));

export default function Index({ categories }: MenuPageProps) {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, wasSuccessful, reset } = useForm({
        name: '',
        description: '',
    });

    useEffect(() => {
        if (wasSuccessful) {
            setOpen(false);
            reset();
        }
    }, [wasSuccessful, reset]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('dashboard.menu.categories.store'));
    };

    return (
        <DashboardLayout>
            <Head title="Menú" />

            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Menú</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Administra las categorías y productos de tu negocio</p>
                    </div>
                    {categories.length > 0 && (
                        <Button onClick={() => setOpen(true)}>
                            <Plus className="size-4" />
                            Nueva categoría
                        </Button>
                    )}
                </div>

                {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                        <FolderOpen className="text-muted-foreground mb-4 size-16 stroke-1" />
                        <h2 className="text-lg font-semibold">Aún no tienes categorías</h2>
                        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                            Crea tu primera categoría para empezar a agregar productos
                        </p>
                        <Button className="mt-6" onClick={() => setOpen(true)}>
                            <Plus className="size-4" />
                            Crear primera categoría
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {categories.map((category) => (
                            <Card key={category.id}>
                                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{category.name}</CardTitle>
                                        {category.description && (
                                            <p className="text-muted-foreground text-sm">{category.description}</p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Badge variant="secondary">
                                            {category.products.length} {category.products.length === 1 ? 'producto' : 'productos'}
                                        </Badge>
                                        <Badge
                                            className={cn(
                                                category.is_active
                                                    ? 'border-green-200 bg-green-100 text-green-800'
                                                    : 'border-transparent bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {category.is_active ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    {category.products.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">Sin productos en esta categoría.</p>
                                    ) : (
                                        <ul className="divide-border divide-y">
                                            {category.products.map((product) => (
                                                <li key={product.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                                    <div>
                                                        <p className="font-medium">{product.name}</p>
                                                        {product.description && (
                                                            <p className="text-muted-foreground text-sm">{product.description}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-muted-foreground text-sm font-medium">
                                                        {formatCurrency(product.price)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>

                                <CardFooter>
                                    <Button variant="outline" size="sm">
                                        <Plus className="size-4" />
                                        Agregar producto
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva categoría</DialogTitle>
                        <DialogDescription>Organiza tu menú agrupando productos en categorías.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                disabled={processing}
                                placeholder="Tacos"
                                required
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <textarea
                                id="description"
                                rows={3}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                disabled={processing}
                                placeholder="Opcional"
                                className={cn(
                                    'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                                )}
                            />
                            <InputError message={errors.description} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={processing}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <LoaderCircle className="size-4 animate-spin" />}
                                Crear categoría
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
