export interface Zone {
    id: string;
    name: string;
    fee: string;
    center_lat: string;
    center_lng: string;
    radius_km: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

export function findZoneForCoords(zones: Zone[], lat: number, lng: number): Zone | null {
    return (
        zones.find(
            (zone) =>
                haversineKm(lat, lng, Number(zone.center_lat), Number(zone.center_lng)) <= Number(zone.radius_km),
        ) ?? null
    );
}
