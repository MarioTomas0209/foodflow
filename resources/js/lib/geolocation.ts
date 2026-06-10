export interface GeoCoordinates {
    latitude: number;
    longitude: number;
}

export function requestGeolocation(): Promise<GeoCoordinates> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Tu navegador no soporta geolocalización.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('Permiso de ubicación denegado. Actívalo en tu navegador para continuar.'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('No pudimos obtener tu ubicación. Verifica que el GPS esté activo.'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('La solicitud de ubicación tardó demasiado. Intenta de nuevo.'));
                        break;
                    default:
                        reject(new Error('No pudimos obtener tu ubicación.'));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            },
        );
    });
}
