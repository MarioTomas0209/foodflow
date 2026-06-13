export interface ParsedCoords {
    latitude: number;
    longitude: number;
}

export interface ResolvedMapsLink {
    latitude: number | null;
    longitude: number | null;
    mapsUrl: string;
}

function isValidCoords(latitude: number, longitude: number): boolean {
    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function coordsFromPair(lat: number, lng: number): ParsedCoords | null {
    return isValidCoords(lat, lng) ? { latitude: lat, longitude: lng } : null;
}

export function buildMapsUrl(latitude: number | string, longitude: number | string): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function buildMapsSearchUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getOrderDeliveryMapsUrl(order: {
    type: 'pickup' | 'delivery';
    delivery_maps_url?: string | null;
}): string | null {
    if (order.type !== 'delivery') {
        return null;
    }

    const pastedUrl = order.delivery_maps_url?.trim();

    return pastedUrl || null;
}

export function parseGoogleMapsUrl(input: string): ParsedCoords | null {
    const trimmed = input.trim();

    if (!trimmed) {
        return null;
    }

    const directMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);

    if (directMatch) {
        return coordsFromPair(Number(directMatch[1]), Number(directMatch[2]));
    }

    let url: URL;

    try {
        url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    } catch {
        return null;
    }

    const paramNames = ['q', 'query', 'll', 'center', 'destination'];

    for (const name of paramNames) {
        const value = url.searchParams.get(name);

        if (!value) {
            continue;
        }

        const decoded = decodeURIComponent(value.replace(/\+/g, ' '));
        const pairMatch = decoded.match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);

        if (pairMatch) {
            const parsed = coordsFromPair(Number(pairMatch[1]), Number(pairMatch[2]));

            if (parsed) {
                return parsed;
            }
        }
    }

    const placeMatch = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);

    if (placeMatch) {
        return coordsFromPair(Number(placeMatch[1]), Number(placeMatch[2]));
    }

    const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

    if (atMatch) {
        return coordsFromPair(Number(atMatch[1]), Number(atMatch[2]));
    }

    const qMatch = url.href.match(/[?&]q=(-?\d+(?:\.\d+)?)[,%2C](-?\d+(?:\.\d+)?)/i);

    if (qMatch) {
        return coordsFromPair(Number(qMatch[1]), Number(qMatch[2]));
    }

    return null;
}

export function isGoogleMapsShareUrl(input: string): boolean {
    const trimmed = input.trim();

    if (!trimmed) {
        return false;
    }

    if (/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.test(trimmed)) {
        return true;
    }

    try {
        const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
        const host = url.hostname.toLowerCase();

        return (
            host === 'maps.app.goo.gl' ||
            host === 'goo.gl' ||
            host.endsWith('.google.com') ||
            host === 'google.com'
        );
    } catch {
        return false;
    }
}

export async function resolveGoogleMapsUrl(input: string, endpoint: string): Promise<ResolvedMapsLink | null> {
    const trimmed = input.trim();

    if (!trimmed) {
        return null;
    }

    const local = parseGoogleMapsUrl(trimmed);

    if (local) {
        return {
            latitude: local.latitude,
            longitude: local.longitude,
            mapsUrl: trimmed,
        };
    }

    if (!isGoogleMapsShareUrl(trimmed)) {
        return null;
    }

    try {
        const params = new URLSearchParams({ url: trimmed });
        const response = await fetch(`${endpoint}?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            return {
                latitude: null,
                longitude: null,
                mapsUrl: trimmed,
            };
        }

        const data = (await response.json()) as {
            latitude?: number | null;
            longitude?: number | null;
            maps_url?: string;
        };

        const latitude = data.latitude ?? null;
        const longitude = data.longitude ?? null;
        const mapsUrl = data.maps_url?.trim() || trimmed;

        if (latitude !== null && longitude !== null && isValidCoords(latitude, longitude)) {
            return { latitude, longitude, mapsUrl };
        }

        return {
            latitude: null,
            longitude: null,
            mapsUrl,
        };
    } catch {
        return {
            latitude: null,
            longitude: null,
            mapsUrl: trimmed,
        };
    }
}
