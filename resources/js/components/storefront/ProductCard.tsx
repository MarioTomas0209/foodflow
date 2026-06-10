import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { type Product, type ProductVariant } from '@/types';

interface ProductCardProps {
    product: Product;
    onAdd: (product: Product, variant?: ProductVariant) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
        product.has_variants && product.variants.length > 0 ? product.variants[0].id : null,
    );

    const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
    const canAdd = !product.has_variants || selectedVariant !== undefined;

    const handleAdd = () => {
        if (product.has_variants) {
            if (!selectedVariant) {
                return;
            }

            onAdd(product, selectedVariant);
            return;
        }

        onAdd(product);
    };

    return (
        <Card className="overflow-hidden py-0">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-3">
                    <div>
                        <h3 className="text-base font-semibold">{product.name}</h3>
                        {product.description && (
                            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{product.description}</p>
                        )}
                    </div>

                    {product.has_variants && product.variants.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                Elige una opción
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {product.variants.map((variant) => (
                                    <Button
                                        key={variant.id}
                                        type="button"
                                        variant={selectedVariantId === variant.id ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn('h-auto rounded-full px-3 py-2')}
                                        onClick={() => setSelectedVariantId(variant.id)}
                                    >
                                        <span>{variant.name}</span>
                                        <span className="ml-2 font-semibold tabular-nums">
                                            {formatCurrency(variant.price)}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-lg font-semibold tabular-nums">{formatCurrency(product.price)}</p>
                    )}
                </div>

                <Button
                    type="button"
                    size="lg"
                    className="w-full shrink-0 rounded-xl sm:w-auto sm:px-4"
                    disabled={!canAdd}
                    onClick={handleAdd}
                >
                    <Plus className="size-5" />
                    Agregar
                </Button>
            </CardContent>
        </Card>
    );
}
