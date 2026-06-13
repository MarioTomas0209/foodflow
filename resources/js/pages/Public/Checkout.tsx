import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, MapPin } from 'lucide-react';
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
import { formatHourLabel } from '@/lib/business-hours';
import { findZoneForCoords, type Zone } from '@/lib/delivery-zones';
import { formatCurrency } from '@/lib/format-currency';
import { requestGeolocation } from '@/lib/geolocation';
import { buildMapsUrl, extractGoogleMapsUrl, isGoogleMapsShareUrl, parseGoogleMapsUrl, resolveGoogleMapsUrl, type ResolvedMapsLink } from '@/lib/maps';
import { getPreorderWindow, type CartContext } from '@/lib/preorder';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import PublicLayout from '@/layouts/PublicLayout';
import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { type CartItem, type CartSource, type Customer, type CustomerAddress, type PublicOrganization } from '@/types';

const DEFAULT_DELIVERY_CITY = 'Comitán de Domínguez, Chiapas';
const inputClassName = 'rounded-xl';

function flattenFormErrors(errors: Record<string, string | string[]>): string[] {
    return Object.values(errors).flatMap((message) => (Array.isArray(message) ? message : [message])).filter(Boolean);
}

function CheckoutCard({
    title,
    children,
    className,
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('border-border bg-card space-y-4 rounded-2xl border p-4 shadow-sm', className)}>
            {title && (
                <h2 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">{title}</h2>
            )}
            {children}
        </section>
    );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return (
        <Label htmlFor={htmlFor} className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            {children}
        </Label>
    );
}

function OptionButton({
    selected,
    children,
    onClick,
    disabled,
}: {
    selected: boolean;
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn(
                'h-auto rounded-2xl border py-4 font-semibold',
                selected && storefrontAccent.buttonOnOutline,
            )}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </Button>
    );
}

function zoneLabel(zone: Zone): string {
    return `${zone.name} — ${formatCurrency(zone.fee)}`;
}

function ZoneSelectField({
    id,
    zones,
    value,
    onChange,
    disabled,
    detectedZone,
    lockZone,
}: {
    id: string;
    zones: Zone[];
    value: string;
    onChange: (zoneId: string) => void;
    disabled?: boolean;
    detectedZone?: Zone | null;
    lockZone?: boolean;
}) {
    const selectedZone =
        lockZone && detectedZone ? detectedZone : (zones.find((zone) => zone.id === value) ?? null);

    if (lockZone && detectedZone) {
        return (
            <div
                id={id}
                className={cn(
                    'rounded-xl border p-3',
                    storefrontAccent.cardActive,
                    'bg-orange-50/60 dark:bg-orange-950/25',
                )}
            >
                <p className="text-sm font-semibold">{zoneLabel(detectedZone)}</p>
                {detectedZone.description && (
                    <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{detectedZone.description}</p>
                )}
            </div>
        );
    }

    return (
        <>
            <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger id={id} className={inputClassName}>
                    <SelectValue placeholder="Selecciona tu zona" />
                </SelectTrigger>
                <SelectContent>
                    {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                            {zoneLabel(zone)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {selectedZone && (
                <div
                    className={cn(
                        'rounded-xl border p-3',
                        storefrontAccent.cardActive,
                        'bg-orange-50/60 dark:bg-orange-950/25',
                    )}
                >
                    <p className="text-sm font-semibold">{zoneLabel(selectedZone)}</p>
                    {selectedZone.description && (
                        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{selectedZone.description}</p>
                    )}
                </div>
            )}
        </>
    );
}

function DeliveryZoneMessages({
    hasCoords,
    detectedZone,
}: {
    hasCoords: boolean;
    detectedZone: Zone | null;
}) {
    if (hasCoords && detectedZone) {
        return (
            <p className="text-sm text-green-700 dark:text-green-400">
                Zona asignada según tu ubicación: {detectedZone.name}. El costo de envío se calcula con esta zona.
            </p>
        );
    }

    if (hasCoords && !detectedZone) {
        return (
            <p className="text-amber-700 text-sm dark:text-amber-400">
                Tu ubicación no coincide con ninguna zona automática. Selecciona tu zona manualmente.
            </p>
        );
    }

    return (
        <p className="text-muted-foreground text-sm">Selecciona la zona donde recibirás tu pedido.</p>
    );
}

interface CheckoutProps {
    organization: PublicOrganization;
    zones: Zone[];
    customer: Customer | null;
    addresses: CustomerAddress[];
    cart_context: CartContext;
}

export default function Checkout({ organization, zones, customer, addresses, cart_context }: CheckoutProps) {
    const didInit = useRef(false);
    const errorBannerRef = useRef<HTMLDivElement>(null);
    const mapsResolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mapsSubmitOverride = useRef<Partial<{
        latitude: number | null;
        longitude: number | null;
        delivery_maps_url: string;
        zone_id: string;
    }> | null>(null);
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
            source: CartSource;
        }>,
        scheduled_for: null as string | null,
        is_preorder: false,
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
        (latitude: number | null, longitude: number | null, mapsUrl: string | null = null, zoneId: string | null = null) => {
            const zone =
                zoneId !== null && zoneId !== ''
                    ? (zones.find((candidate) => candidate.id === zoneId) ?? null)
                    : latitude !== null && longitude !== null
                      ? findZoneForCoords(zones, latitude, longitude)
                      : null;

            setData((current) => ({
                ...current,
                latitude,
                longitude,
                delivery_maps_url: mapsUrl ?? '',
                zone_id: zone?.id ?? (latitude !== null && longitude !== null ? '' : current.zone_id),
            }));
            if (mapsUrl) {
                setMapsLinkInput(mapsUrl);
            }
            setLocationStatus(latitude !== null && longitude !== null ? 'success' : mapsUrl ? 'success' : 'idle');
            setLocationError(null);
            setMapsLinkError(null);
        },
        [setData, zones],
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

    const resolveMapsLinkInput = useCallback(
        async (rawInput?: string): Promise<ResolvedMapsLink | null> => {
            const trimmed = extractGoogleMapsUrl((rawInput ?? mapsLinkInput).trim());

            if (!trimmed) {
                if (data.latitude !== null || data.longitude !== null) {
                    clearCoordinates();
                }

                setMapsLinkError(null);
                return null;
            }

            if (trimmed !== mapsLinkInput.trim()) {
                setMapsLinkInput(trimmed);
            }

            const localParsed = parseGoogleMapsUrl(trimmed);

            if (localParsed) {
                const resolved = {
                    latitude: localParsed.latitude,
                    longitude: localParsed.longitude,
                    mapsUrl: trimmed,
                };
                applyCoordinates(resolved.latitude, resolved.longitude, resolved.mapsUrl, null);
                return resolved;
            }

            if (!isGoogleMapsShareUrl(trimmed)) {
                setMapsLinkError('Pega un enlace de Google Maps o escribe las coordenadas (lat, lng).');
                return null;
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
                    return null;
                }

                applyCoordinates(
                    resolved.latitude,
                    resolved.longitude,
                    resolved.mapsUrl,
                    resolved.zoneId ?? null,
                );
                return resolved;
            } finally {
                setMapsLinkResolving(false);
            }
        },
        [
            applyCoordinates,
            clearCoordinates,
            data.latitude,
            data.longitude,
            mapsLinkInput,
            organization.slug,
        ],
    );

    const scheduleMapsLinkResolve = useCallback(
        (value: string) => {
            if (mapsResolveTimer.current) {
                clearTimeout(mapsResolveTimer.current);
            }

            const trimmed = extractGoogleMapsUrl(value.trim());

            if (!trimmed || (!parseGoogleMapsUrl(trimmed) && !isGoogleMapsShareUrl(trimmed))) {
                return;
            }

            mapsResolveTimer.current = setTimeout(() => {
                void resolveMapsLinkInput(trimmed);
            }, 350);
        },
        [resolveMapsLinkInput],
    );

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
                source: item.source ?? 'menu',
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
            ...(mapsSubmitOverride.current ?? {}),
            delivery_maps_url:
                mapsSubmitOverride.current?.delivery_maps_url ??
                (payload.delivery_maps_url?.trim() ||
                    extractGoogleMapsUrl(mapsLinkInput) ||
                    null),
            zone_id: mapsSubmitOverride.current?.zone_id ?? (payload.zone_id || null),
            address_id: payload.address_id || null,
            save_address: payload.save_address || false,
            address_label: payload.address_label?.trim() || null,
        }));
    }, [mapsLinkInput, transform]);

    useEffect(
        () => () => {
            if (mapsResolveTimer.current) {
                clearTimeout(mapsResolveTimer.current);
            }
        },
        [],
    );

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

    const preorderWindow = useMemo(
        () => (cartItems ? getPreorderWindow(cartItems, cart_context) : null),
        [cartItems, cart_context],
    );

    useEffect(() => {
        if (preorderWindow === null && data.is_preorder) {
            setData((current) => ({
                ...current,
                is_preorder: false,
                scheduled_for: null,
            }));
        }
    }, [data.is_preorder, preorderWindow, setData]);

    const hasLocatedCoords =
        locationStatus === 'success' && data.latitude !== null && data.longitude !== null;

    const gpsZone = useMemo(() => {
        if (!hasLocatedCoords) {
            return null;
        }

        return findZoneForCoords(zones, data.latitude!, data.longitude!);
    }, [hasLocatedCoords, data.latitude, data.longitude, zones]);

    const matchedZone = useMemo(() => {
        if (data.type !== 'delivery') {
            return null;
        }

        if (hasLocatedCoords && gpsZone) {
            return gpsZone;
        }

        if (data.zone_id) {
            return zones.find((zone) => zone.id === data.zone_id) ?? null;
        }

        return null;
    }, [data.type, data.zone_id, gpsZone, hasLocatedCoords, zones]);

    const lockDeliveryZone = hasLocatedCoords && gpsZone !== null;

    const deliveryFee = data.type === 'delivery' && matchedZone ? Number(matchedZone.fee) : 0;
    const orderTotal = subtotal + deliveryFee;
    const formErrors = useMemo(() => flattenFormErrors(errors), [errors]);
    const showSavedAddresses = Boolean(customer && addresses.length > 0 && data.type === 'delivery' && !useCustomAddress);
    const showDeliveryForm = data.type === 'delivery' && (!customer || addresses.length === 0 || useCustomAddress);

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();

        mapsSubmitOverride.current = null;

        if (mapsLinkInput.trim() && (data.latitude === null || data.longitude === null)) {
            const resolved = await resolveMapsLinkInput(mapsLinkInput);

            if (resolved && resolved.latitude !== null && resolved.longitude !== null) {
                const zone = findZoneForCoords(zones, resolved.latitude, resolved.longitude);

                mapsSubmitOverride.current = {
                    latitude: resolved.latitude,
                    longitude: resolved.longitude,
                    delivery_maps_url: resolved.mapsUrl,
                    zone_id: zone?.id ?? data.zone_id,
                };
            } else if (resolved?.mapsUrl) {
                mapsSubmitOverride.current = {
                    delivery_maps_url: resolved.mapsUrl,
                };
            }
        }

        post(route('storefront.orders.store', organization.slug), {
            onSuccess: () => clearCartStorage(),
            onError: () => {
                errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            },
        });
    };

    const canSubmit =
        !processing &&
        !mapsLinkResolving &&
        (data.type !== 'delivery' ||
            (matchedZone !== null && (data.delivery_address !== '' || data.address_id !== ''))) &&
        (!data.is_preorder || Boolean(data.scheduled_for));

    if (!cartItems) {
        return null;
    }

    return (
        <PublicLayout organization={organization} className="pb-8">
            <Head title={`Checkout — ${organization.name}`} />

            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-10 shrink-0 rounded-full"
                        onClick={() => router.visit(route('storefront.show', organization.slug))}
                    >
                        <ArrowLeft className="size-4" />
                        <span className="sr-only">Volver al menú</span>
                    </Button>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Confirmar pedido</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Completa tus datos para finalizar.</p>
                    </div>
                </div>

                {formErrors.length > 0 && (
                    <div
                        ref={errorBannerRef}
                        role="alert"
                        className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                    >
                        <p className="font-semibold">No pudimos confirmar tu pedido</p>
                        <ul className="list-inside list-disc space-y-1 opacity-90">
                            {formErrors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                    <CheckoutCard title="Tus datos">
                        <div className="grid gap-2">
                            <FieldLabel htmlFor="customer-name">Nombre completo</FieldLabel>
                            <Input
                                id="customer-name"
                                className={inputClassName}
                                value={data.customer_name}
                                onChange={(e) => setData('customer_name', e.target.value)}
                                disabled={processing}
                                required
                            />
                            <InputError message={errors.customer_name} />
                        </div>

                        <div className="grid gap-2">
                            <FieldLabel htmlFor="customer-phone">Teléfono</FieldLabel>
                            <Input
                                id="customer-phone"
                                type="tel"
                                className={inputClassName}
                                value={data.customer_phone}
                                onChange={(e) => setData('customer_phone', e.target.value)}
                                disabled={processing}
                                required
                            />
                            <InputError message={errors.customer_phone} />
                        </div>
                    </CheckoutCard>

                    <CheckoutCard title="Tipo de entrega">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <OptionButton
                                selected={data.type === 'pickup'}
                                disabled={processing}
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
                            >
                                Recoger en sucursal
                            </OptionButton>
                            <OptionButton
                                selected={data.type === 'delivery'}
                                disabled={processing}
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
                            >
                                A domicilio
                            </OptionButton>
                        </div>
                        <InputError message={errors.type} />
                    </CheckoutCard>

                    {data.type === 'delivery' && (
                        <CheckoutCard title="Dirección de entrega">
                            {showSavedAddresses && (
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold">Tus direcciones</p>
                                    <div className="grid gap-2">
                                        {addresses.map((address) => (
                                            <Button
                                                key={address.id}
                                                type="button"
                                                variant="outline"
                                                className={cn(
                                                    'h-auto justify-start rounded-2xl px-4 py-3 text-left',
                                                    data.address_id === address.id && storefrontAccent.buttonOnOutline,
                                                )}
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
                                                    <p className="text-xs opacity-80">{address.city}</p>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={cn('px-0', storefrontAccent.text)}
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
                                <FieldLabel htmlFor="delivery-address">Dirección</FieldLabel>
                                <Input
                                    id="delivery-address"
                                    className={inputClassName}
                                    value={data.delivery_address}
                                    onChange={(e) => setData('delivery_address', e.target.value)}
                                    disabled={processing}
                                    required
                                />
                                <InputError message={errors.delivery_address} />
                            </div>

                            <div className="grid gap-2">
                                <FieldLabel htmlFor="delivery-city">Ciudad</FieldLabel>
                                <Input
                                    id="delivery-city"
                                    className={cn(inputClassName, 'bg-muted cursor-not-allowed')}
                                    value={DEFAULT_DELIVERY_CITY}
                                    readOnly
                                    disabled
                                    tabIndex={-1}
                                />
                                <InputError message={errors.delivery_city} />
                            </div>

                            {zones.length > 0 && (
                                <div className="grid gap-2">
                                    <FieldLabel htmlFor="delivery-zone">Zona de entrega</FieldLabel>
                                    <DeliveryZoneMessages hasCoords={hasLocatedCoords} detectedZone={gpsZone} />
                                    <ZoneSelectField
                                        id="delivery-zone"
                                        zones={zones}
                                        value={data.zone_id}
                                        detectedZone={gpsZone}
                                        lockZone={lockDeliveryZone}
                                        disabled={processing}
                                        onChange={(zoneId) => {
                                            setData((current) => ({
                                                ...current,
                                                zone_id: zoneId,
                                            }));
                                        }}
                                    />
                                    <InputError message={errors.delivery_address} />
                                    <InputError message={errors.zone_id} />
                                </div>
                            )}

                            <div className="bg-muted/40 space-y-3 rounded-2xl border p-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className={cn('mt-0.5 size-5 shrink-0', storefrontAccent.text)} />
                                    <div className="space-y-1 text-sm">
                                        <p className="font-semibold">Ubicación exacta (opcional)</p>
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
                                                    className={cn(
                                                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                                        storefrontAccent.pillMuted,
                                                    )}
                                                >
                                                    <MapPin className="size-3.5" />
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
                                    <FieldLabel htmlFor="maps-link">Enlace de Google Maps</FieldLabel>
                                    <Input
                                        id="maps-link"
                                        type="text"
                                        inputMode="url"
                                        autoComplete="off"
                                        className={inputClassName}
                                        value={mapsLinkInput}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setMapsLinkInput(value);
                                            setMapsLinkError(null);
                                            scheduleMapsLinkResolve(value);
                                        }}
                                        onPaste={(e) => {
                                            const pasted = e.clipboardData.getData('text');

                                            if (mapsResolveTimer.current) {
                                                clearTimeout(mapsResolveTimer.current);
                                            }

                                            window.setTimeout(() => {
                                                void resolveMapsLinkInput(pasted);
                                            }, 0);
                                        }}
                                        onBlur={() => {
                                            void resolveMapsLinkInput();
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
                                            className={inputClassName}
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
                                    <FieldLabel htmlFor="delivery-zone-saved">Zona de entrega</FieldLabel>
                                    <DeliveryZoneMessages hasCoords={hasLocatedCoords} detectedZone={gpsZone} />
                                    <ZoneSelectField
                                        id="delivery-zone-saved"
                                        zones={zones}
                                        value={data.zone_id}
                                        detectedZone={gpsZone}
                                        lockZone={lockDeliveryZone}
                                        disabled={processing}
                                        onChange={(zoneId) => {
                                            setData((current) => ({
                                                ...current,
                                                zone_id: zoneId,
                                            }));
                                        }}
                                    />
                                    <InputError message={errors.delivery_address} />
                                    <InputError message={errors.zone_id} />
                                </div>
                            )}
                        </CheckoutCard>
                    )}

                    {preorderWindow && (
                        <section className="space-y-3 hidden">
                            <h2 className="text-lg font-semibold">¿Cuándo quieres tu pedido?</h2>
                            <p className="text-muted-foreground text-sm">
                                Algunos platillos de tu pedido están fuera de horario. Puedes recibirlo lo antes posible
                                o programar una hora entre{' '}
                                {formatHourLabel(preorderWindow.available_from)} y{' '}
                                {formatHourLabel(preorderWindow.available_until)}.
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    variant={!data.is_preorder ? 'default' : 'outline'}
                                    size="lg"
                                    className="h-auto rounded-xl py-4"
                                    onClick={() =>
                                        setData((current) => ({
                                            ...current,
                                            is_preorder: false,
                                            scheduled_for: null,
                                        }))
                                    }
                                    disabled={processing}
                                >
                                    Lo antes posible
                                </Button>
                                <Button
                                    type="button"
                                    variant={data.is_preorder ? 'default' : 'outline'}
                                    size="lg"
                                    className="h-auto rounded-xl py-4"
                                    onClick={() => setData('is_preorder', true)}
                                    disabled={processing}
                                >
                                    Programar hora
                                </Button>
                            </div>
                            {data.is_preorder && (
                                <div className="grid gap-2">
                                    <Label htmlFor="scheduled-for">Hora del pedido</Label>
                                    <Input
                                        id="scheduled-for"
                                        type="time"
                                        min={preorderWindow.available_from}
                                        max={preorderWindow.available_until}
                                        value={data.scheduled_for ?? ''}
                                        onChange={(e) => setData('scheduled_for', e.target.value || null)}
                                        required
                                        disabled={processing}
                                    />
                                    <InputError message={errors.scheduled_for} />
                                </div>
                            )}
                            <InputError message={errors.is_preorder} />
                        </section>
                    )}

                    <CheckoutCard title="Método de pago">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <OptionButton
                                selected={data.payment_method === 'cash'}
                                disabled={processing}
                                onClick={() => setData('payment_method', 'cash')}
                            >
                                Efectivo
                            </OptionButton>
                            <OptionButton
                                selected={data.payment_method === 'transfer'}
                                disabled={processing}
                                onClick={() => setData('payment_method', 'transfer')}
                            >
                                Transferencia
                            </OptionButton>
                        </div>
                        <InputError message={errors.payment_method} />
                    </CheckoutCard>

                    <CheckoutCard title="Notas">
                        <div className="grid gap-2">
                            <FormTextarea
                                id="customer-notes"
                                rows={3}
                                className={inputClassName}
                                maxLength={5000}
                                value={data.customer_notes}
                                onChange={(e) => setData('customer_notes', e.target.value)}
                                disabled={processing}
                                placeholder="Instrucciones especiales para tu pedido"
                            />
                            <InputError message={errors.customer_notes} />
                        </div>
                    </CheckoutCard>

                    <CheckoutCard title="Resumen del pedido">
                        <ul className="space-y-3">
                            {cartItems.map((item) => (
                                <li
                                    key={`${item.source}:${item.productId}:${item.variantId ?? 'base'}`}
                                    className="flex items-start gap-3"
                                >
                                    <ProductThumbnail
                                        image={item.productImage}
                                        name={item.productName}
                                        className="size-12 rounded-xl"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-bold leading-snug">{item.productName}</p>
                                                {item.variantName && (
                                                    <p className="text-muted-foreground text-sm">{item.variantName}</p>
                                                )}
                                                <p className="text-muted-foreground text-sm">x{item.quantity}</p>
                                            </div>
                                            <span className={cn('shrink-0 font-bold tabular-nums', storefrontAccent.text)}>
                                                {formatCurrency(item.price * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <Separator />

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                            </div>
                            {data.type === 'delivery' && matchedZone && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Costo de envío</span>
                                    <span className="font-medium tabular-nums">{formatCurrency(deliveryFee)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-base font-bold">Total</span>
                                <span className={cn('text-xl font-bold tabular-nums', storefrontAccent.text)}>
                                    {formatCurrency(orderTotal)}
                                </span>
                            </div>
                        </div>
                    </CheckoutCard>

                    <InputError message={errors.items} />

                    <Button
                        type="submit"
                        size="lg"
                        className={cn('h-12 w-full rounded-full text-base font-semibold', storefrontAccent.button)}
                        disabled={!canSubmit}
                    >
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Confirmar pedido
                    </Button>
                </form>
            </div>
        </PublicLayout>
    );
}
