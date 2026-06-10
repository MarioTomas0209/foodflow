import { router } from '@inertiajs/react';
import { route as ziggyRoute, type Config } from 'ziggy-js';

type ZiggyConfig = Config & { location: string };

export function setupZiggy(ziggy: ZiggyConfig) {
    globalThis.route = (name, params, absolute, config = ziggy) => ziggyRoute(name, params, absolute, config);
}

export function listenForZiggyUpdates() {
    router.on('success', (event) => {
        const ziggy = event.detail.page.props.ziggy as ZiggyConfig | undefined;

        if (ziggy) {
            setupZiggy(ziggy);
        }
    });
}
