import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, MapPin, RefreshCw } from 'lucide-react';
import { FormEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import InputError from '@/components/input-error';
import { FormTextarea } from '@/components/menu/form-textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { clearCartStorage, loadCartFromStorage } from '@/lib/cart-storage';
import { findZoneForCoords, type Zone } from '@/lib/delivery-zones';
import { formatCurrency } from '@/lib/format-currency';
import { requestGeolocation } from '@/lib/geolocation';
import { buildMapsUrl, isGoogleMapsShareUrl, parseGoogleMapsUrl, resolveGoogleMapsUrl } from '@/lib/maps';
import PublicLayout from '@/layouts/PublicLayout';
import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { type CartItem, type Customer, type CustomerAddress, type PublicOrganization } from '@/types';

const DEFAULT_DELIVERY_CITY = 'Comitán de Domínguez, Chiapas';

function flattenFormErrors(errors: Record<string, string | string[]>): string[] {
    return Object.values(errors).flatMap((message) => (Array.isArray(message) ? message : [message])).filter(Boolean);
}

interface CheckoutProps {
    organization: PublicOrganization;
    zones: Zone[];
    customer: Customer | null;
    addresses: CustomerAddress[];
}

export default function Checkout({ organization, zones, customer, addresses }: CheckoutProps) {
    const didInit = useRef(false);
    const errorBannerRef = useRef<HTMLDivElement>(null);
    const [cartItems, setCartItems] = useState<CartItem[] | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [locationError, setLocationError] = useState<string | null>(null);
    const [mapsLinkInput, setMapsLinkInput] = useState('');
    const [mapsLinkError, setMapsLinkError] = useState<string | null>(null);
    const [mapsLinkResolving, setMapsLinkResolving] = useState(false);
    const [useCustomAddress, setUseCustomAddress] = useState(addresses.length === 0);

    const { data, setData, post, processing, errors, transform } = useForm({
        organization_id: organization.id,
        customer_name: '',
        customer_phone: '',
        customer_notes: '',
        type: 'pickup' as 'pickup' | 'delivery',
        delivery_address: '',
        delivery_city: DEFAULT_DELIVERY_CITY,
        latitude: null as number | null,
        longitude: null as number | null,
        delivery_maps_url: '' as string,
        zone_id: '' as string,
        address_id: '' as string,
        save_address: false as boolean,
        address_label: '',
        payment_method: 'cash' as 'cash' | 'transfer',
        items: [] as Array<{
            product_id: string;
            product_variant_id: string | null;
            quantity: number;
        }>,
    });

    const selectSavedAddress = useCallback(
        (address: CustomerAddress) => {
            const lat = address.latitude !== null ? Number(address.latitude) : null;
            const lng = address.longitude !== null ? Number(address.longitude) : null;
            const zone = lat !== null && lng !== null ? findZoneForCoords(zones, lat, lng) : null;

            setData((current) => ({
                ...current,
                address_id: address.id,
                delivery_address: address.address,
                delivery_city: address.city,
                latitude: lat,
                longitude: lng,
                delivery_maps_url: address.maps_url ?? '',
                zone_id: zone?.id ?? '',
                save_address: false,
                address_label: '',
            }));
            setMapsLinkInput(address.maps_url ?? '');
            setLocationStatus(lat !== null && lng !== null || address.maps_url ? 'success' : 'idle');
            setLocationError(null);
            setMapsLinkError(null);
            setUseCustomAddress(false);
        },
        [setData, zones],
    );

    const clearSavedAddressSelection = useCallback(() => {
        setUseCustomAddress(true);
        setData((current) => ({
            ...current,
            address_id: '',
            delivery_address: '',
            delivery_city: DEFAULT_DELIVERY_CITY,
            latitude: null,
            longitude: null,
            delivery_maps_url: '',
            zone_id: '',
            save_address: false,
            address_label: '',
        }));
        setMapsLinkInput('');
        setLocationStatus('idle');
        setLocationError(null);
        setMapsLinkError(null);
    }, [setData]);

    const applyCoordinates = useCallback(
        (latitude: number | null, longitude: number | null, mapsUrl: string | null = null) => {
            setData((current) => ({
                ...current,
                latitude,
                longitude,
                delivery_maps_url: mapsUrl ?? '',
            }));
            if (mapsUrl) {
                setMapsLinkInput(mapsUrl);
            }
            setLocationStatus('success');
            setLocationError(null);
            setMapsLinkError(null);
        },
        [setData],
    );

    const clearCoordinates = useCallback(() => {
        setData((current) => ({
            ...current,
            latitude: null,
            longitude: null,
            delivery_maps_url: '',
        }));
        setMapsLinkInput('');
        setLocationStatus('idle');
        setLocationError(null);
        setMapsLinkError(null);
    }, [setData]);

    const captureLocation = useCallback(async () => {
        setLocationStatus('loading');
        setLocationError(null);
        setMapsLinkError(null);

        try {
            const coords = await requestGeolocation();
            applyCoordinates(coords.latitude, coords.longitude, null);
        } catch (error) {
            setLocationStatus('error');
            setLocationError(error instanceof Error ? error.message : 'No pudimos obtener tu ubicación.');
            setData((current) => ({
                ...current,
                latitude: null,
                longitude: null,
                delivery_maps_url: '',
            }));
            setMapsLinkInput('');
        }
    }, [applyCoordinates, setData]);

    const handleMapsLinkBlur = useCallback(async () => {
        const trimmed = mapsLinkInput.trim();

        if (!trimmed) {
            if (data.latitude !== null || data.longitude !== null) {
                clearCoordinates();
            }

            setMapsLinkError(null);
            return;
        }

        const localParsed = parseGoogleMapsUrl(trimmed);

        if (localParsed) {
            applyCoordinates(localParsed.latitude, localParsed.longitude, trimmed);
            return;
        }

        if (!isGoogleMapsShareUrl(trimmed)) {
            setMapsLinkError('Pega un enlace de Google Maps o escribe las coordenadas (lat, lng).');
            return;
        }

        setMapsLinkResolving(true);
        setMapsLinkError(null);

        try {
            const resolved = await resolveGoogleMapsUrl(
                trimmed,
                route('storefront.maps.resolve', organization.slug),
            );

            if (!resolved) {
                setMapsLinkError('Pega un enlace válido de Google Maps.');
                return;
            }

            applyCoordinates(resolved.latitude, resolved.longitude, resolved.mapsUrl);
        } finally {
            setMapsLinkResolving(false);
        }
    }, [
        applyCoordinates,
        clearCoordinates,
        data.latitude,
        data.longitude,
        mapsLinkInput,
        organization.slug,
    ]);

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
        setData((current) => ({
            ...current,
            items: storedCart.items.map((item) => ({
                product_id: item.productId,
                product_variant_id: item.variantId,
                quantity: item.quantity,
            })),
            ...(customer
                ? {
                      customer_name: customer.name,
                      customer_phone: customer.phone,
                  }
                : {}),
        }));
    }, [customer, organization.id, organization.slug, setData]);

    useEffect(() => {
        transform((payload) => ({
            ...payload,
            delivery_maps_url: payload.delivery_maps_url?.trim() || mapsLinkInput.trim() || null,
            zone_id: payload.zone_id || null,
            address_id: payload.address_id || null,
            save_address: payload.save_address || false,
            address_label: payload.address_label?.trim() || null,
        }));
    }, [mapsLinkInput, transform]);

    useEffect(() => {
        if (Object.keys(errors).length === 0) {
            return;
        }

        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [errors]);

    useEffect(() => {
        if (locationStatus !== 'success' || data.latitude === null || data.longitude === null) {
            return;
        }

        const gpsZone = findZoneForCoords(zones, data.latitude, data.longitude);

        if (gpsZone) {
            setData('zone_id', gpsZone.id);
        }
    }, [locationStatus, data.latitude, data.longitude, zones, setData]);

    const subtotal = useMemo(
        () => (cartItems ?? []).reduce((sum, item) => sum + item.price * item.quantity, 0),
        [cartItems],
    );

    const matchedZone = useMemo(() => {
        if (data.type !== 'delivery') {
            return null;
        }

        if (locationStatus === 'success' && data.latitude !== null && data.longitude !== null) {
            const gpsZone = findZoneForCoords(zones, data.latitude, data.longitude);

            if (gpsZone) {
                return gpsZone;
            }
        }

        if (data.zone_id) {
            return zones.find((zone) => zone.id === data.zone_id) ?? null;
        }

        return null;
    }, [data.type, data.latitude, data.longitude, data.zone_id, locationStatus, zones]);

    const gpsZone = useMemo(() => {
        if (locationStatus !== 'success' || data.latitude === null || data.longitude === null) {
            return null;
        }

        return findZoneForCoords(zones, data.latitude, data.longitude);
    }, [locationStatus, data.latitude, data.longitude, zones]);

    const deliveryFee = data.type === 'delivery' && matchedZone ? Number(matchedZone.fee) : 0;
    const orderTotal = subtotal + deliveryFee;
    const formErrors = useMemo(() => flattenFormErrors(errors), [errors]);
    const showSavedAddresses = Boolean(customer && addresses.length > 0 && data.type === 'delivery' && !useCustomAddress);
    const showDeliveryForm = data.type === 'delivery' && (!customer || addresses.length === 0 || useCustomAddress);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('storefront.orders.store', organization.slug), {
            preserveScroll: true,
            onSuccess: () => clearCartStorage(),
            onError: () => {
                errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            },
        });
    };

    const canSubmit =
        !processing &&
        (data.type !== 'delivery' ||
            (matchedZone !== null && (data.delivery_address !== '' || data.address_id !== '')));

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

                {formErrors.length > 0 && (
                    <div
                        ref={errorBannerRef}
                        role="alert"
                        className="border-destructive/40 bg-destructive/10 space-y-2 rounded-xl border p-4 text-sm"
                    >
                        <p className="text-destructive font-medium">No pudimos confirmar tu pedido</p>
                        <ul className="text-destructive/90 list-inside list-disc space-y-1">
                            {formErrors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={submit} noValidate className="flex flex-col gap-6">
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
                                        zone_id: '',
                                        delivery_maps_url: '',
                                        address_id: '',
                                        save_address: false,
                                        address_label: '',
                                    }));
                                    setLocationStatus('idle');
                                    setLocationError(null);
                                    setMapsLinkInput('');
                                    setMapsLinkError(null);
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
                                    setData((current) => ({
                                        ...current,
                                        type: 'delivery',
                                        delivery_city: DEFAULT_DELIVERY_CITY,
                                        zone_id: '',
                                    }));
                                    setLocationStatus('idle');
                                    setLocationError(null);
                                    setMapsLinkInput('');
                                    setMapsLinkError(null);

                                    if (customer && addresses.length > 0) {
                                        selectSavedAddress(addresses[0]);
                                    } else {
                                        setUseCustomAddress(true);
                                    }
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
                            {showSavedAddresses && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold">Tus direcciones</h3>
                                    <div className="grid gap-2">
                                        {addresses.map((address) => (
                                            <Button
                                                key={address.id}
                                                type="button"
                                                variant={data.address_id === address.id ? 'default' : 'outline'}
                                                className="h-auto justify-start rounded-xl px-4 py-3 text-left"
                                                onClick={() => selectSavedAddress(address)}
                                                disabled={processing}
                                            >
                                                <div className="space-y-0.5">
                                                    {address.label && (
                                                        <p className="font-medium">{address.label}</p>
                                                    )}
                                                    <p className={address.label ? 'text-sm opacity-90' : 'font-medium'}>
                                                        {address.address}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">{address.city}</p>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="px-0"
                                        onClick={clearSavedAddressSelection}
                                        disabled={processing}
                                    >
                                        Usar otra dirección
                                    </Button>
                                </div>
                            )}

                            {showDeliveryForm && (
                                <>
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

                            {zones.length > 0 && (
                                <div className="grid gap-2">
                                    <Label htmlFor="delivery-zone">Zona de entrega</Label>
                                    {gpsZone && (
                                        <p className="text-sm text-green-700 dark:text-green-400">
                                            Zona detectada: {gpsZone.name}. Puedes cambiarla si no es correcta.
                                        </p>
                                    )}
                                    {locationStatus === 'success' && !gpsZone && (
                                        <p className="text-muted-foreground text-sm">
                                            No detectamos cobertura en tu ubicación. Selecciona tu zona manualmente.
                                        </p>
                                    )}
                                    {!gpsZone && locationStatus !== 'success' && (
                                        <p className="text-muted-foreground text-sm">
                                            Selecciona la zona donde recibirás tu pedido.
                                        </p>
                                    )}
                                    <Select
                                        value={data.zone_id || undefined}
                                        onValueChange={(id) => {
                                            setData((current) => ({
                                                ...current,
                                                zone_id: id,
                                            }));
                                        }}
                                        disabled={processing}
                                    >
                                        <SelectTrigger id="delivery-zone">
                                            <SelectValue placeholder="Selecciona tu zona" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zones.map((zone) => (
                                                <SelectItem key={zone.id} value={zone.id}>
                                                    {zone.name} — {formatCurrency(zone.fee)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.delivery_address} />
                                    <InputError message={errors.zone_id} />
                                </div>
                            )}

                            <div className="bg-muted/40 space-y-3 rounded-xl border p-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className="text-primary mt-0.5 size-5 shrink-0" />
                                    <div className="space-y-1 text-sm">
                                        <p className="font-medium">Ubicación exacta (opcional)</p>
                                        <p className="text-muted-foreground">
                                            Pega un enlace de Google Maps para
                                            ayudar al repartidor a llegar con precisión.
                                        </p>
                                    </div>
                                </div>

                                {locationStatus === 'loading' && (
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Obteniendo tu ubicación…
                                    </p>
                                )}

                                {locationStatus === 'success' &&
                                    (data.delivery_maps_url ||
                                        (data.latitude !== null && data.longitude !== null)) && (
                                    <div className="space-y-4 text-sm">
                                        <p className="text-green-700 dark:text-green-400">
                                            {data.delivery_maps_url
                                                ? 'Enlace de ubicación guardado.'
                                                : 'Ubicación capturada verifica que esté correcta tu dirección.'}
                                        </p>
                                        {(data.delivery_maps_url ||
                                            (data.latitude !== null && data.longitude !== null)) && (
                                            <p>
                                                <a
                                                    href={
                                                        data.delivery_maps_url ||
                                                        buildMapsUrl(data.latitude!, data.longitude!)
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary bg-blue-500 p-1 rounded-md font-medium underline-offset-4 hover:underline"
                                                >
                                                    Ver ubicación en Google Maps
                                                </a>
                                            </p>
                                        )}
                                        {data.latitude !== null && data.longitude !== null && (
                                            <div className="text-muted-foreground tabular-nums">
                                                <p>
                                                    {Number(data.latitude).toFixed(6)},{' '}
                                                    {Number(data.longitude).toFixed(6)}
                                                </p>
                                            </div>
                                        )}
                                   
                                        {data.delivery_maps_url &&
                                            data.latitude === null &&
                                            data.longitude === null && (
                                                <p className="text-muted-foreground">
                                                    Selecciona tu zona de entrega arriba para calcular el envío.
                                                </p>
                                            )}
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="maps-link">Enlace de Google Maps</Label>
                                    <Input
                                        id="maps-link"
                                        type="text"
                                        inputMode="url"
                                        value={mapsLinkInput}
                                        onChange={(e) => {
                                            setMapsLinkInput(e.target.value);
                                            setMapsLinkError(null);
                                        }}
                                        onBlur={() => {
                                            void handleMapsLinkBlur();
                                        }}
                                        disabled={processing || mapsLinkResolving}
                                        placeholder="https://maps.app.goo.gl/... o 16.2520, -92.1350"
                                    />
                                    {mapsLinkResolving && (
                                        <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <LoaderCircle className="size-4 animate-spin" />
                                            Leyendo enlace de Google Maps…
                                        </p>
                                    )}
                                    {mapsLinkError && <p className="text-destructive text-sm">{mapsLinkError}</p>}
                                    <InputError message={errors.delivery_maps_url} />
                                </div>

                                {(locationStatus === 'error' || locationError) && (
                                    <p className="text-muted-foreground text-sm">
                                        {locationError ?? 'No pudimos obtener tu ubicación. Puedes seleccionar tu zona arriba.'}
                                    </p>
                                )}

                                <InputError message={errors.latitude} />
                                <InputError message={errors.longitude} />

                                {/* {locationStatus !== 'loading' && (
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
                                        {locationStatus === 'success' || locationStatus === 'error' ? (
                                            <>
                                                <RefreshCw className="size-4" />
                                                Actualizar ubicación
                                            </>
                                        ) : (
                                            <>
                                                <MapPin className="size-4" />
                                                Usar mi ubicación
                                            </>
                                        )}
                                    </Button>
                                )} */}
                            </div>

                            {customer && !data.address_id && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={data.save_address}
                                            onChange={(e) => setData('save_address', e.target.checked)}
                                            disabled={processing}
                                        />
                                        Guardar esta dirección
                                    </label>
                                    {data.save_address && (
                                        <Input
                                            placeholder="Ej: Casa, Trabajo (opcional)"
                                            value={data.address_label}
                                            onChange={(e) => setData('address_label', e.target.value)}
                                            disabled={processing}
                                        />
                                    )}
                                </div>
                            )}
                                </>
                            )}

                            {showSavedAddresses && data.address_id && zones.length > 0 && (
                                <div className="grid gap-2">
                                    <Label htmlFor="delivery-zone-saved">Zona de entrega</Label>
                                    {gpsZone && (
                                        <p className="text-sm text-green-700 dark:text-green-400">
                                            Zona detectada: {gpsZone.name}. Puedes cambiarla si no es correcta.
                                        </p>
                                    )}
                                    <Select
                                        value={data.zone_id || undefined}
                                        onValueChange={(id) => {
                                            setData((current) => ({
                                                ...current,
                                                zone_id: id,
                                            }));
                                        }}
                                        disabled={processing}
                                    >
                                        <SelectTrigger id="delivery-zone-saved">
                                            <SelectValue placeholder="Selecciona tu zona" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zones.map((zone) => (
                                                <SelectItem key={zone.id} value={zone.id}>
                                                    {zone.name} — {formatCurrency(zone.fee)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.delivery_address} />
                                    <InputError message={errors.zone_id} />
                                </div>
                            )}
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
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <ProductThumbnail
                                        image={item.productImage}
                                        name={item.productName}
                                        className="size-12"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
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
                                        </div>
                                    </div>
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
