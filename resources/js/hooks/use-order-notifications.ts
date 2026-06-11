import { useCallback, useEffect, useMemo, useState } from 'react';

export interface OrderNotification {
    id: string;
    customer_name: string;
    total: string;
    type: 'pickup' | 'delivery';
    items_count: number;
    created_at: string;
    read: boolean;
}

interface NewOrderPayload {
    id: string;
    customer_name: string;
    total: string;
    type: 'pickup' | 'delivery';
    items_count: number;
    created_at: string;
}

export function useOrderNotifications(organizationId: string | undefined) {
    const [notifications, setNotifications] = useState<OrderNotification[]>([]);

    useEffect(() => {
        if (!organizationId || typeof window.Echo === 'undefined') {
            return;
        }

        const channelName = `organization.${organizationId}`;

        window.Echo.private(channelName).listen('.new-order', (payload: NewOrderPayload) => {
            setNotifications((current) => [
                {
                    ...payload,
                    read: false,
                },
                ...current,
            ]);
        });

        return () => {
            window.Echo.leave(channelName);
        };
    }, [organizationId]);

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.read).length,
        [notifications],
    );

    const markAllAsRead = useCallback(() => {
        setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    }, []);

    const dismiss = useCallback((id: string) => {
        setNotifications((current) => current.filter((notification) => notification.id !== id));
    }, []);

    return {
        notifications,
        unreadCount,
        markAllAsRead,
        dismiss,
    };
}
