export function registerStorefrontPwa(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    void import('virtual:pwa-register').then(({ registerSW }) => {
        registerSW({
            immediate: true,
        });
    });
}

export function isPwaStandalone(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
    );
}
