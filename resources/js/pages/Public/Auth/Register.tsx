import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import {
    AuthFieldLabel,
    AuthSwitchLink,
    CustomerAuthShell,
    inputClassName,
} from '@/components/storefront/CustomerAuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PublicLayout from '@/layouts/PublicLayout';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
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
        <PublicLayout organization={organization} className="pb-8">
            <Head title={`Registrarse — ${organization.name}`} />

            <div className="flex flex-col gap-4">
                <Button variant="outline" size="icon" className="size-10 shrink-0 rounded-full" asChild>
                    <Link href={namedRoute('storefront.show', organization.slug)}>
                        <ArrowLeft className="size-4" />
                        <span className="sr-only">Volver al menú</span>
                    </Link>
                </Button>

                <CustomerAuthShell
                    organization={organization}
                    title="Crear cuenta"
                    subtitle="Regístrate con tu teléfono para guardar direcciones y repetir pedidos."
                    footer={
                        <p className="text-muted-foreground">
                            ¿Ya tienes cuenta?{' '}
                            <AuthSwitchLink href={namedRoute('storefront.login', organization.slug)}>
                                Inicia sesión
                            </AuthSwitchLink>
                        </p>
                    }
                >
                    <form className="space-y-4" onSubmit={submit}>
                        <div className="grid gap-2">
                            <AuthFieldLabel htmlFor="name">Nombre</AuthFieldLabel>
                            <Input
                                id="name"
                                className={inputClassName}
                                type="text"
                                required
                                autoFocus
                                autoComplete="name"
                                placeholder="Tu nombre"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <AuthFieldLabel htmlFor="phone">Teléfono</AuthFieldLabel>
                            <Input
                                id="phone"
                                className={inputClassName}
                                type="tel"
                                required
                                autoComplete="tel"
                                inputMode="tel"
                                placeholder="963 123 4567"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <AuthFieldLabel htmlFor="password">Contraseña</AuthFieldLabel>
                            <Input
                                id="password"
                                className={inputClassName}
                                type="password"
                                required
                                autoComplete="new-password"
                                minLength={6}
                                placeholder="Mínimo 6 caracteres"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className={cn('h-12 w-full rounded-full text-base font-semibold', storefrontAccent.button)}
                            disabled={processing}
                        >
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Crear cuenta
                        </Button>
                    </form>
                </CustomerAuthShell>
            </div>
        </PublicLayout>
    );
}
