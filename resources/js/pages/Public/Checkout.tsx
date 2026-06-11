import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, MapPin, RefreshCw } from 'lucide-react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { clearCartStorage, loadCartFromStorage } from '@/lib/cart-storage';
import { findZoneForCoords, type Zone } from '@/lib/delivery-zones';
import { formatCurrency } from '@/lib/format-currency';
import { requestGeolocation } from '@/lib/geolocation';
import PublicLayout from '@/layouts/PublicLayout';
import { type CartItem, type PublicOrganization } from '@/types';

const DEFAULT_DELIVERY_CITY = 'Comitán de Domínguez, Chiapas';

interface CheckoutProps {
    organization: PublicOrganization;
    zones: Zone[];
}

export default function Checkout({ organization, zones }: CheckoutProps) {
    const didInit = useRef(false);
    const [cartItems, setCartItems] = useState<CartItem[] | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [locationError, setLocationError] = useState<string | null>(null);

    const { data, setData, post, processing, errors } = useForm({
        organization_id: organization.id,
        customer_name: '',
        customer_phone: '',
        customer_notes: '',
        type: 'pickup' as 'pickup' | 'delivery',
        delivery_address: '',
        delivery_city: DEFAULT_DELIVERY_CITY,
        latitude: null as number | null,
        longitude: null as number | null,
        payment_method: 'cash' as 'cash' | 'transfer',
        items: [] as Array<{
            product_id: string;
            product_variant_id: string | null;
            quantity: number;
        }>,
    });

    const captureLocation = useCallback(async () => {
        setLocationStatus('loading');
        setLocationError(null);

        try {
            const coords = await requestGeolocation();
            setData((current) => ({
                ...current,
                latitude: coords.latitude,
                longitude: coords.longitude,
            }));
            setLocationStatus('success');
        } catch (error) {
            setLocationStatus('error');
            setLocationError(error instanceof Error ? error.message : 'No pudimos obtener tu ubicación.');
            setData((current) => ({
                ...current,
                latitude: null,
                longitude: null,
            }));
        }
    }, [setData]);

    useEffect(() => {
        if (didInit.current) {
            return;
        }

        didInit.current = true;

        const storedCart = loadCartFromStorage(organization.id);

        if (!storedCart) {
            router.visit(route('storefront.show', organization.slug));
            return;
        }

        setCartItems(storedCart.items);
        setData(
            'items',
            storedCart.items.map((item) => ({
                product_id: item.productId,
                product_variant_id: item.variantId,
                quantity: item.quantity,
            })),
        );
    }, [organization.id, organization.slug, setData]);

    useEffect(() => {
        if (data.type !== 'delivery' || locationStatus !== 'idle') {
            return;
        }

        void captureLocation();
    }, [data.type, locationStatus, captureLocation]);

    const subtotal = useMemo(
        () => (cartItems ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
        [cartItems],
    );

    const matchedZone = useMemo(() => {
        if (
            data.type !== 'delivery' ||
            locationStatus !== 'success' ||
            data.latitude === null ||
            data.longitude === null
        ) {
            return null;
        }

        return findZoneForCoords(zones, data.latitude, data.longitude);
    }, [data.type, data.latitude, data.longitude, locationStatus, zones]);

    const deliveryFee = data.type === 'delivery' && matchedZone ? Number(matchedZone.fee) : 0;
    const orderTotal = subtotal + deliveryFee;
    const isOutOfCoverage =
        data.type === 'delivery' &&
        locationStatus === 'success' &&
        data.latitude !== null &&
        data.longitude !== null &&
        matchedZone === null;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (data.type === 'delivery' && (data.latitude === null || data.longitude === null)) {
            setLocationError('Necesitamos tu ubicación para entregar a domicilio.');
            setLocationStatus('error');
            return;
        }

        post(route('storefront.orders.store', organization.slug), {
            onSuccess: () => clearCartStorage(),
        });
    };

    const canSubmit =
        !processing &&
        !isOutOfCoverage &&
        (data.type !== 'delivery' || (data.latitude !== null && data.longitude !== null && locationStatus === 'success'));

    if (!cartItems) {
        return null;
    }

    return (
        <PublicLayout organization={organization}>
            <Head title={`Checkout — ${organization.name}`} />

            <div className="flex flex-col gap-6 pb-8">
                <Button
                    type="button"
                    variant="ghost"
                    className="w-fit px-0"
                    onClick={() => router.visit(route('storefront.show', organization.slug))}
                >
                    <ArrowLeft className="size-4" />
                    Volver al menú
                </Button>

                <div>
                    <h1 className="text-2xl font-semibold">Confirmar pedido</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Completa tus datos para finalizar.</p>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">Tus datos</h2>

                        <div className="grid gap-2">
                            <Label htmlFor="customer-name">Nombre completo</Label>
                            <Input
                                id="customer-name"
                                value={data.customer_name}
                                onChange={(e) => setData('customer_name', e.target.value)}
                                disabled={processing}
                                required
                            />
                            <InputError message={errors.customer_name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="customer-phone">Teléfono</Label>
                            <Input
                                id="customer-phone"
                                type="tel"
                                value={data.customer_phone}
                                onChange={(e) => setData('customer_phone', e.target.value)}
                                disabled={processing}
                                required
                            />
                            <InputError message={errors.customer_phone} />
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">Tipo de entrega</h2>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Button
                                type="button"
                                variant={data.type === 'pickup' ? 'default' : 'outline'}
                                size="lg"
                                className="h-auto rounded-xl py-4"
                                onClick={() => {
                                    setData((current) => ({
                                        ...current,
                                        type: 'pickup',
                                        latitude: null,
                                        longitude: null,
                                    }));
                                    setLocationStatus('idle');
                                    setLocationError(null);
                                }}
                                disabled={processing}
                            >
                                Recoger en sucursal
                            </Button>
                            <Button
                                type="button"
                                variant={data.type === 'delivery' ? 'default' : 'outline'}
                                size="lg"
                                className="h-auto rounded-xl py-4"
                                onClick={() => {
                                    setData('type', 'delivery');
                                    setData('delivery_city', DEFAULT_DELIVERY_CITY);
                                    setLocationStatus('idle');
                                }}
                                disabled={processing}
                            >
                                A domicilio
                            </Button>
                        </div>
                        <InputError message={errors.type} />
                    </section>

                    {data.type === 'delivery' && (
                        <section className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="delivery-address">Dirección</Label>
                                <Input
                                    id="delivery-address"
                                    value={data.delivery_address}
                                    onChange={(e) => setData('delivery_address', e.target.value)}
                                    disabled={processing}
                                    required
                                />
                                <InputError message={errors.delivery_address} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="delivery-city">Ciudad</Label>
                                <Input
                                    id="delivery-city"
                                    value={DEFAULT_DELIVERY_CITY}
                                    readOnly
                                    disabled
                                    tabIndex={-1}
                                    className="bg-muted cursor-not-allowed"
                                />
                                <p className="text-muted-foreground text-xs">
                                    Por ahora solo entregamos en {DEFAULT_DELIVERY_CITY}.
                                </p>
                                <InputError message={errors.delivery_city} />
                            </div>

                            <div className="bg-muted/40 space-y-3 rounded-xl border p-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className="text-primary mt-0.5 size-5 shrink-0" />
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium">Ubicación exacta</p>
                                        <p className="text-muted-foreground">
                                            Usamos tu GPS para que el repartidor llegue a tu domicilio con precisión.
                                        </p>
                                    </div>
                                </div>

                                {locationStatus === 'loading' && (
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Obteniendo tu ubicación…
                                    </p>
                                )}

                                {locationStatus === 'success' && data.latitude !== null && data.longitude !== null && (
                                    <>
                                        {matchedZone ? (
                                            <p className="text-sm text-green-700 dark:text-green-400">
                                                Ubicación capturada. Zona: {matchedZone.name}
                                            </p>
                                        ) : (
                                            <p className="text-destructive text-sm">
                                                Tu dirección está fuera de nuestra zona de cobertura.
                                            </p>
                                        )}
                                    </>
                                )}

                                {(locationStatus === 'error' || locationError) && (
                                    <p className="text-destructive text-sm">{locationError}</p>
                                )}

                                <InputError message={errors.latitude} />
                                <InputError message={errors.longitude} />

                                {(locationStatus === 'error' || locationStatus === 'success') && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setLocationStatus('idle');
                                            void captureLocation();
                                        }}
                                        disabled={processing}
                                    >
                                        <RefreshCw className="size-4" />
                                        Actualizar ubicación
                                    </Button>
                                )}
                            </div>
                        </section>
                    )}

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">Método de pago</h2>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Button
                                type="button"
                                variant={data.payment_method === 'cash' ? 'default' : 'outline'}
                                size="lg"
                                className="h-auto rounded-xl py-4"
                                onClick={() => setData('payment_method', 'cash')}
                                disabled={processing}
                            >
                                Efectivo
                            </Button>
                            <Button
                                type="button"
                                variant={data.payment_method === 'transfer' ? 'default' : 'outline'}
                                size="lg"
                                className="h-auto rounded-xl py-4"
                                onClick={() => setData('payment_method', 'transfer')}
                                disabled={processing}
                            >
                                Transferencia
                            </Button>
                        </div>
                        <InputError message={errors.payment_method} />
                    </section>

                    <div className="grid gap-2">
                        <Label htmlFor="customer-notes">Notas (opcional)</Label>
                        <FormTextarea
                            id="customer-notes"
                            rows={3}
                            value={data.customer_notes}
                            onChange={(e) => setData('customer_notes', e.target.value)}
                            disabled={processing}
                            placeholder="Instrucciones especiales para tu pedido"
                        />
                        <InputError message={errors.customer_notes} />
                    </div>

                    <section className="bg-muted/40 space-y-3 rounded-xl border p-4">
                        <h2 className="text-lg font-semibold">Resumen del pedido</h2>
                        <ul className="space-y-2">
                            {cartItems.map((item) => (
                                <li
                                    key={`${item.productId}:${item.variantId ?? 'base'}`}
                                    className="flex items-start justify-between gap-3 text-sm"
                                >
                                    <div>
                                        <p className="font-medium">{item.productName}</p>
                                        {item.variantName && (
                                            <p className="text-muted-foreground">{item.variantName}</p>
                                        )}
                                        <p className="text-muted-foreground">x{item.quantity}</p>
                                    </div>
                                    <span className="font-medium tabular-nums">
                                        {formatCurrency(item.price * item.quantity)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                        </div>
                        {data.type === 'delivery' && matchedZone && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Costo de envío</span>
                                <span className="font-medium tabular-nums">{formatCurrency(deliveryFee)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Total</span>
                            <span className="text-lg font-semibold tabular-nums">{formatCurrency(orderTotal)}</span>
                        </div>
                    </section>

                    <InputError message={errors.items} />

                    <Button type="submit" size="lg" className="w-full rounded-xl" disabled={!canSubmit}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Confirmar pedido
                    </Button>
                </form>
            </div>
        </PublicLayout>
    );
}
