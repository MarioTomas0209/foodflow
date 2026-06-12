import { Head, useForm } from '@inertiajs/react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useMemo, useRef } from 'react';

import { ShareMenuActions } from '@/components/dashboard/share-menu-actions';
import { BusinessHoursForm } from '@/components/dashboard/business-hours-form';
import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/layouts/DashboardLayout';
import { type DashboardOrganization, type OrganizationHour } from '@/types';

interface EditProps {
    organization: DashboardOrganization;
    hours: OrganizationHour[];
}

export default function Edit({ organization, hours }: EditProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        name: organization.name,
        description: organization.description ?? '',
        phone: organization.phone ?? '',
        email: organization.email ?? '',
        address: organization.address ?? '',
        city: organization.city ?? '',
        state: organization.state ?? '',
        logo: null as File | null,
    });

    const logoPreview = useMemo(() => {
        if (data.logo) {
            return URL.createObjectURL(data.logo);
        }

        return organization.logo;
    }, [data.logo, organization.logo]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('dashboard.settings.update'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <DashboardLayout>
            <Head title="Configuración" />

            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configuración del negocio</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Actualiza la información que ven tus clientes en tu menú público.
                    </p>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <section className="border-border space-y-4 rounded-xl border p-4">
                        <h2 className="font-semibold">Logo</h2>

                        <div className="flex items-center gap-4">
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt={organization.name}
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
                                    id="logo"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => setData('logo', e.target.files?.[0] ?? null)}
                                    disabled={processing}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={processing}
                                >
                                    {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                                </Button>
                                <p className="text-muted-foreground text-xs">JPG, PNG o WebP. Máximo 2 MB.</p>
                            </div>
                        </div>

                        <InputError message={errors.logo} />
                    </section>

                    <section className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre del negocio</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                disabled={processing}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="slug">URL pública</Label>
                            <Input id="slug" value={organization.slug} readOnly disabled className="bg-muted cursor-not-allowed" />
                            <p className="text-muted-foreground text-xs">
                                {window.location.host}/{organization.slug}
                            </p>
                            <ShareMenuActions slug={organization.slug} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <FormTextarea
                                id="description"
                                rows={4}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                disabled={processing}
                                placeholder="Cuéntale a tus clientes sobre tu negocio"
                            />
                            <InputError message={errors.description} />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="font-semibold">Contacto</h2>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                disabled={processing}
                                placeholder="+52 55 1234 5678"
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                disabled={processing}
                                placeholder="contacto@minegocio.com"
                            />
                            <InputError message={errors.email} />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="font-semibold">Ubicación</h2>

                        <div className="grid gap-2">
                            <Label htmlFor="address">Dirección</Label>
                            <Input
                                id="address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.address} />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="city">Ciudad</Label>
                                <Input
                                    id="city"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    disabled={processing}
                                />
                                <InputError message={errors.city} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="state">Estado</Label>
                                <Input
                                    id="state"
                                    value={data.state}
                                    onChange={(e) => setData('state', e.target.value)}
                                    disabled={processing}
                                />
                                <InputError message={errors.state} />
                            </div>
                        </div>
                    </section>

                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Guardar cambios
                    </Button>
                </form>

                <BusinessHoursForm hours={hours} />
            </div>
        </DashboardLayout>
    );
}
