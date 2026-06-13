import { Check } from 'lucide-react';

import {
    formatOrderListDate,
    getOrderTimelineSteps,
    getTimelineStepState,
    type OrderTimelineStep,
} from '@/lib/order-status';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type Order } from '@/types';

interface OrderStatusTimelineProps {
    order: Order;
}

function TimelineMarker({ state }: { state: ReturnType<typeof getTimelineStepState> }) {
    if (state === 'completed') {
        return (
            <span
                className={cn(
                    'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full',
                    storefrontAccent.button,
                )}
            >
                <Check className="size-3.5" strokeWidth={3} />
            </span>
        );
    }

    if (state === 'current') {
        return (
            <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-orange-500 bg-background">
                <span className="size-2.5 rounded-full bg-orange-500" />
            </span>
        );
    }

    if (state === 'cancelled') {
        return <span className="relative z-10 size-6 shrink-0 rounded-full border-2 border-red-400 bg-background" />;
    }

    return <span className="relative z-10 size-6 shrink-0 rounded-full border-2 border-border bg-background" />;
}

function TimelineStepRow({
    step,
    state,
    isLast,
}: {
    step: OrderTimelineStep;
    state: ReturnType<typeof getTimelineStepState>;
    isLast: boolean;
}) {
    const isActive = state === 'completed' || state === 'current';

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <TimelineMarker state={state} />
                {!isLast && (
                    <span
                        className={cn(
                            'my-1 w-0.5 flex-1 rounded-full',
                            state === 'completed' ? 'bg-orange-500' : 'bg-border',
                        )}
                    />
                )}
            </div>

            <div className={cn('min-w-0 pb-5', isLast && 'pb-0')}>
                <p
                    className={cn(
                        'text-sm font-semibold',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                    )}
                >
                    {step.label}
                </p>
                {state === 'current' && step.progressLabel && (
                    <p className="text-muted-foreground mt-0.5 text-xs">{step.progressLabel}</p>
                )}
                {state === 'cancelled' && (
                    <p className="mt-0.5 text-xs font-medium text-red-600 dark:text-red-400">Cancelado</p>
                )}
            </div>
        </div>
    );
}

export function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
    const steps = getOrderTimelineSteps(order.type);

    return (
        <section className="border-border bg-card space-y-4 rounded-2xl border p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">Estado del pedido</h2>
                <p className="text-muted-foreground shrink-0 text-xs">{formatOrderListDate(order.created_at)}</p>
            </div>

            <div>
                {steps.map((step, index) => (
                    <TimelineStepRow
                        key={step.label}
                        step={step}
                        state={getTimelineStepState(index, order.status, order.type)}
                        isLast={index === steps.length - 1}
                    />
                ))}
            </div>
        </section>
    );
}
