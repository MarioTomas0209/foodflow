import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

import { registerStorefrontPwa } from '@/lib/pwa';
import { type PublicOrganization } from '@/types';

const SPLASH_PRESETS = [
    {
        width: 1284,
        height: 2778,
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
    },
    {
        width: 1170,
        height: 2532,
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
    },
    {
        width: 750,
        height: 1334,
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
    },
] as const;

interface StorefrontPwaHeadProps {
    organization: PublicOrganization;
}

export function StorefrontPwaHead({ organization }: StorefrontPwaHeadProps) {
    useEffect(() => {
        registerStorefrontPwa();
    }, []);

    const icon192 = `/${organization.slug}/pwa/icon-192.png`;
    const icon512 = `/${organization.slug}/pwa/icon-512.png`;

    return (
        <Head>
            <link rel="manifest" href={`/${organization.slug}/manifest.webmanifest`} />
            <meta name="theme-color" content="#f97316" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content={organization.name} />
            <link rel="apple-touch-icon" href={icon192} />
            <link rel="icon" type="image/png" sizes="192x192" href={icon192} />
            <link rel="icon" type="image/png" sizes="512x512" href={icon512} />
            {SPLASH_PRESETS.map((preset) => (
                <link
                    key={`${preset.width}x${preset.height}`}
                    rel="apple-touch-startup-image"
                    href={`/${organization.slug}/pwa/splash-${preset.width}x${preset.height}.png`}
                    media={preset.media}
                />
            ))}
        </Head>
    );
}
