import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { type DailyMenuItem, type DailyMenuItemVariant } from '@/types';

interface DailyMenuItemCardProps {
    item: DailyMenuItem;
}

function isInStock(stock: number | null): boolean {
    return stock === null || stock > 0;
}

function firstAvailableVariantId(item: DailyMenuItem): string | null {
    const available = item.variants.find((variant) => isInStock(variant.stock));

    return available?.id ?? item.variants[0]?.id ?? null;
}

export function DailyMenuItemCard({ item }: DailyMenuItemCardProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(() =>
        item.has_variants ? firstAvailableVariantId(item) : null,
    );

    const selectedVariant = item.variants.find((variant) => variant.id === selectedVariantId);
    const hasAvailableVariants = item.variants.some((variant) => isInStock(variant.stock));
    const isSoldOut = item.has_variants ? !hasAvailableVariants : item.stock === 0;

    const displayPrice = item.has_variants && selectedVariant ? selectedVariant.price : item.price;

    const variantSoldOutMap = useMemo(
        () => new Map(item.variants.map((variant) => [variant.id, variant.stock === 0])),
        [item.variants],
    );

    return (
        <Card className={cn('flex h-full flex-col overflow-hidden py-0', isSoldOut && 'opacity-90')}>
            <div className="relative aspect-[4/3] w-full shrink-0">
                {item.image ? (
                    <img src={item.image} alt={item.name} className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/20">
                        <span className="text-5xl font-semibold text-orange-700/70 dark:text-orange-300/70">
                            {item.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                {isSoldOut && (
                    <Badge variant="secondary" className="absolute top-3 right-3 shadow-sm">
                        Agotado
                    </Badge>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-base leading-snug font-semibold">{item.name}</h3>
                    {item.description && (
                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                            {item.description}
                        </p>
                    )}
                    {!item.has_variants && (
                        <p className="pt-1 text-lg font-semibold tabular-nums">{formatCurrency(item.price)}</p>
                    )}
                </div>

                {item.has_variants && item.variants.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                            {item.variants.map((variant: DailyMenuItemVariant) => {
                                const variantSoldOut = variantSoldOutMap.get(variant.id) ?? false;

                                return (
                                    <Button
                                        key={variant.id}
                                        type="button"
                                        variant={selectedVariantId === variant.id ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={variantSoldOut}
                                        className={cn(
                                            'h-auto rounded-full px-2.5 py-1.5 text-xs',
                                            variantSoldOut && 'opacity-60',
                                        )}
                                        onClick={() => setSelectedVariantId(variant.id)}
                                    >
                                        <span>{variant.name}</span>
                                        <span className="ml-1.5 font-semibold tabular-nums">
                                            {formatCurrency(variant.price)}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                        {selectedVariant && (
                            <p className="text-base font-semibold tabular-nums">{formatCurrency(displayPrice)}</p>
                        )}
                    </div>
                )}

                {isSoldOut && (
                    <div className="text-muted-foreground mt-auto flex h-10 w-full items-center justify-center rounded-xl border border-dashed text-sm font-medium">
                        Agotado
                    </div>
                )}
            </div>
        </Card>
    );
}
