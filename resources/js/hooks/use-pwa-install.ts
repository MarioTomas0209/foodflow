import { useCallback, useEffect, useRef, useState } from 'react';

import { isPwaStandalone } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
    const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalled, setIsInstalled] = useState(isPwaStandalone);

    useEffect(() => {
        setIsInstalled(isPwaStandalone());

        const handleBeforeInstall = (event: Event) => {
            event.preventDefault();
            deferredPrompt.current = event as BeforeInstallPromptEvent;
            setCanInstall(true);
        };

        const handleAppInstalled = () => {
            deferredPrompt.current = null;
            setCanInstall(false);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const install = useCallback(async () => {
        const promptEvent = deferredPrompt.current;

        if (!promptEvent) {
            return false;
        }

        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;

        deferredPrompt.current = null;
        setCanInstall(false);

        if (choice.outcome === 'accepted') {
            setIsInstalled(true);
            return true;
        }

        return false;
    }, []);

    return {
        canInstall: canInstall && !isInstalled,
        isInstalled,
        install,
    };
}
