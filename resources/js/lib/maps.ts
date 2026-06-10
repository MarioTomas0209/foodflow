export function buildMapsUrl(latitude: number | string, longitude: number | string): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
