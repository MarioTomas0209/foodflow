import { router, usePage } from '@inertiajs/react';
import { route as ziggyRoute, type Config } from 'ziggy-js';

import { type SharedData } from '@/types';

export type ZiggyConfig = Config & { location: string };

declare global {
    // eslint-disable-next-line no-var
    var Ziggy: ZiggyConfig | undefined;
    // eslint-disable-next-line no-var
    var route: typeof ziggyRoute;
}

function mergeZiggyConfig(incoming?: ZiggyConfig): ZiggyConfig | undefined {
    if (!incoming) {
        return globalThis.Ziggy;
    }

    const existing = globalThis.Ziggy;

    if (!existing) {
        globalThis.Ziggy = incoming;
        return incoming;
    }

    globalThis.Ziggy = {
        ...existing,
        ...incoming,
        routes: {
            ...existing.routes,
            ...incoming.routes,
        },
    };

    return globalThis.Ziggy;
}

export function setupZiggy(ziggy?: ZiggyConfig) {
    mergeZiggyConfig(ziggy);

    globalThis.route = ((...args: Parameters<typeof ziggyRoute>) => {
        const [name, params, absolute, config] = args;

        return ziggyRoute(name, params, absolute, config ?? globalThis.Ziggy);
    }) as typeof ziggyRoute;
}

export function listenForZiggyUpdates() {
    router.on('success', (event) => {
        const ziggy = event.detail.page.props.ziggy as ZiggyConfig | undefined;

        if (ziggy) {
            setupZiggy(ziggy);
        }
    });
}

export function useNamedRoute() {
    const { ziggy } = usePage<SharedData>().props;

    return (name: Parameters<typeof ziggyRoute>[0], params?: Parameters<typeof ziggyRoute>[1], absolute?: boolean) =>
        ziggyRoute(name, params, absolute, mergeZiggyConfig(ziggy));
}
