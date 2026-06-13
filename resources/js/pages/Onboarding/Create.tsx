import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useRef } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { AuthFieldLabel, inputClassName } from '@/components/storefront/CustomerAuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storefrontAccent } from '@/lib/storefront-theme';
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
        <>
            <Head title="Crea tu negocio" />
            <OnboardingShell
                title="Crea tu negocio"
                subtitle="Configura tu organización para empezar a publicar tu menú y recibir pedidos."
            >
                <form className="space-y-4" onSubmit={submit}>
                    <div className="grid gap-2">
                        <AuthFieldLabel htmlFor="name">Nombre del negocio</AuthFieldLabel>
                        <Input
                            id="name"
                            className={inputClassName}
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
                        <AuthFieldLabel htmlFor="slug">URL de tu negocio</AuthFieldLabel>
                        <Input
                            id="slug"
                            className={inputClassName}
                            type="text"
                            required
                            value={data.slug}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            disabled={processing}
                            placeholder="taqueria-el-patron"
                        />
                        <div className="bg-muted/40 rounded-xl border px-3 py-2.5">
                            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                                Tu menú público
                            </p>
                            <p className="mt-0.5 font-mono text-sm break-all">
                                <span className="text-muted-foreground">{window.location.host}/</span>
                                <span className="font-medium">{slugPreview}</span>
                            </p>
                        </div>
                        <InputError message={errors.slug} />
                    </div>

                    <div className="grid gap-2">
                        <AuthFieldLabel htmlFor="phone">Teléfono</AuthFieldLabel>
                        <Input
                            id="phone"
                            className={inputClassName}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            disabled={processing}
                            placeholder="+52 55 1234 5678"
                        />
                        <InputError message={errors.phone} />
                    </div>

                    <div className="grid gap-2">
                        <AuthFieldLabel htmlFor="description">Descripción</AuthFieldLabel>
                        <FormTextarea
                            id="description"
                            className={inputClassName}
                            rows={4}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            disabled={processing}
                            placeholder="Cuéntanos sobre tu negocio..."
                        />
                        <InputError message={errors.description} />
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className={cn('h-12 w-full rounded-full text-base font-semibold', storefrontAccent.button)}
                        disabled={processing}
                    >
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Crear negocio
                    </Button>
                </form>
            </OnboardingShell>
        </>
    );
}
