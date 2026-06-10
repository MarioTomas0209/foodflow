import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { cn } from '@/lib/utils';

const generateSlug = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

export default function Create() {
    const slugManuallyEdited = useRef(false);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        slug: '',
        phone: '',
        description: '',
    });

    const handleNameChange = (value: string) => {
        setData((current) => ({
            ...current,
            name: value,
            slug: slugManuallyEdited.current ? current.slug : generateSlug(value),
        }));
    };

    const handleSlugChange = (value: string) => {
        slugManuallyEdited.current = true;
        setData('slug', value);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.store'));
    };

    const slugPreview = data.slug || 'mi-negocio';

    return (
        <AuthLayout title="Crea tu negocio" description="Configura tu organización para empezar a usar FoodFlow">
            <Head title="Onboarding" />
            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre del negocio</Label>
                        <Input
                            id="name"
                            type="text"
                            required
                            autoFocus
                            value={data.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            disabled={processing}
                            placeholder="Taquería El Patrón"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="slug">URL de tu negocio</Label>
                        <Input
                            id="slug"
                            type="text"
                            required
                            value={data.slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            disabled={processing}
                            placeholder="taqueria-el-patron"
                        />
                        <p className="text-muted-foreground text-sm">
                            {window.location.host}/{slugPreview}
                        </p>
                        <InputError message={errors.slug} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                            id="phone"
                            type="text"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            disabled={processing}
                            placeholder="+52 55 1234 5678"
                        />
                        <InputError message={errors.phone} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Descripción</Label>
                        <textarea
                            id="description"
                            rows={4}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            disabled={processing}
                            placeholder="Cuéntanos sobre tu negocio..."
                            className={cn(
                                'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                            )}
                        />
                        <InputError message={errors.description} />
                    </div>

                    <Button type="submit" className="mt-2 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Crear negocio
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
