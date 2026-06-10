import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { type FlashMessages, type SharedData } from '@/types';

export function FlashToaster() {
    const { flash } = usePage<SharedData>().props;
    const shown = useRef<string | null>(null);

    useEffect(() => {
        if (!flash) {
            return;
        }

        const key = JSON.stringify(flash);

        if (shown.current === key) {
            return;
        }

        shown.current = key;

        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }

        if (flash.info) {
            toast.info(flash.info);
        }

        if (flash.warning) {
            toast.warning(flash.warning);
        }

        if (flash.status) {
            toast.info(flash.status);
        }
    }, [flash]);

    return null;
}

export function showToast(type: keyof FlashMessages, message: string) {
    switch (type) {
        case 'success':
            toast.success(message);
            break;
        case 'error':
            toast.error(message);
            break;
        case 'info':
            toast.info(message);
            break;
        case 'warning':
            toast.warning(message);
            break;
    }
}
