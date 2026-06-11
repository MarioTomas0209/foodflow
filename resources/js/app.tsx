import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { FlashToaster } from './components/flash-toaster';
import { Toaster } from './components/ui/sonner';
import { initializeTheme } from './hooks/use-appearance';
import { listenForZiggyUpdates, setupZiggy } from './lib/ziggy';
import './lib/echo';
import { type SharedData } from './types';
import { configureEcho, echo } from '@laravel/echo-react';

configureEcho({
    broadcaster: 'reverb',
});

window.Echo = echo();

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        setupZiggy((props.initialPage.props as SharedData).ziggy);
        listenForZiggyUpdates();

        const root = createRoot(el);

        root.render(
            <App {...props}>
                {({ Component, props: pageProps, key }) => (
                    <>
                        <Component {...pageProps} key={key} />
                        <Toaster richColors closeButton position="bottom-right" />
                        <FlashToaster />
                    </>
                )}
            </App>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
