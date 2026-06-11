import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/layouts/PublicLayout';
import { useNamedRoute } from '@/lib/ziggy';
import { type PublicOrganization } from '@/types';

interface RegisterForm {
    name: string;
    phone: string;
    password: string;
}

interface RegisterProps {
    organization: PublicOrganization;
}

export default function Register({ organization }: RegisterProps) {
    const namedRoute = useNamedRoute();
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        phone: '',
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(namedRoute('storefront.register.store', organization.slug), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <PublicLayout organization={organization}>
            <Head title="Registrarse" />

            <div className="mx-auto w-full max-w-sm">
                <div className="mb-6 space-y-1 text-center">
                    <h2 className="text-xl font-semibold">Crear cuenta</h2>
                    <p className="text-muted-foreground text-sm">
                        Regístrate con tu teléfono para guardar direcciones y repetir pedidos.
                    </p>
                </div>

                <form className="flex flex-col gap-6" onSubmit={submit}>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input
                                id="name"
                                type="text"
                                required
                                autoFocus
                                autoComplete="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                type="tel"
                                required
                                autoComplete="tel"
                                inputMode="tel"
                                placeholder="9631234567"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                autoComplete="new-password"
                                minLength={6}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <InputError message={errors.password} />
                            <p className="text-muted-foreground text-xs">Mínimo 6 caracteres.</p>
                        </div>

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            Crear cuenta
                        </Button>
                    </div>

                    <p className="text-muted-foreground text-center text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <TextLink href={namedRoute('storefront.login', organization.slug)}>Inicia sesión</TextLink>
                    </p>
                </form>
            </div>
        </PublicLayout>
    );
}
