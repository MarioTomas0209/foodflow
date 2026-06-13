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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/layouts/PublicLayout';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { useNamedRoute } from '@/lib/ziggy';
import { type PublicOrganization } from '@/types';

interface LoginForm {
    phone: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    organization: PublicOrganization;
}

export default function Login({ organization }: LoginProps) {
    const namedRoute = useNamedRoute();
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        phone: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(namedRoute('storefront.login.store', organization.slug), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <PublicLayout organization={organization} className="pb-8">
            <Head title={`Iniciar sesión — ${organization.name}`} />

            <div className="flex flex-col gap-4">
                <Button variant="outline" size="icon" className="size-10 shrink-0 rounded-full" asChild>
                    <Link href={namedRoute('storefront.show', organization.slug)}>
                        <ArrowLeft className="size-4" />
                        <span className="sr-only">Volver al menú</span>
                    </Link>
                </Button>

                <CustomerAuthShell
                    organization={organization}
                    title="Iniciar sesión"
                    subtitle="Usa tu teléfono para ver tus pedidos y direcciones guardadas."
                    footer={
                        <p className="text-muted-foreground">
                            ¿No tienes cuenta?{' '}
                            <AuthSwitchLink href={namedRoute('storefront.register', organization.slug)}>
                                Regístrate
                            </AuthSwitchLink>
                        </p>
                    }
                >
                    <form className="space-y-4" onSubmit={submit}>
                        <div className="grid gap-2">
                            <AuthFieldLabel htmlFor="phone">Teléfono</AuthFieldLabel>
                            <Input
                                id="phone"
                                className={inputClassName}
                                type="tel"
                                required
                                autoFocus
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
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                disabled={processing}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <label className="flex items-center gap-3 text-sm">
                            <Checkbox
                                id="remember"
                                checked={data.remember}
                                onCheckedChange={(checked) => setData('remember', checked === true)}
                                disabled={processing}
                            />
                            <Label htmlFor="remember" className="font-normal">
                                Recordarme
                            </Label>
                        </label>

                        <Button
                            type="submit"
                            size="lg"
                            className={cn('h-12 w-full rounded-full text-base font-semibold', storefrontAccent.button)}
                            disabled={processing}
                        >
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Entrar
                        </Button>
                    </form>
                </CustomerAuthShell>
            </div>
        </PublicLayout>
    );
}
