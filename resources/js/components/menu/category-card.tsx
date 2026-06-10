import { Pencil, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { type Category, type Product } from '@/types';

interface CategoryCardProps {
    category: Category;
    onAddProduct: (categoryId: string) => void;
    onEditProduct: (product: Product) => void;
}

export function CategoryCard({ category, onAddProduct, onEditProduct }: CategoryCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    {category.description && <p className="text-muted-foreground text-sm">{category.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">
                        {category.products.length} {category.products.length === 1 ? 'producto' : 'productos'}
                    </Badge>
                    <Badge
                        className={cn(
                            category.is_active
                                ? 'border-green-200 bg-green-100 text-green-800'
                                : 'border-transparent bg-muted text-muted-foreground',
                        )}
                    >
                        {category.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                {category.products.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Sin productos en esta categoría.</p>
                ) : (
                    <ul className="divide-border divide-y">
                        {category.products.map((product) => (
                            <li key={product.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">{product.name}</p>
                                    {product.description && (
                                        <p className="text-muted-foreground text-sm">{product.description}</p>
                                    )}
                                    {product.has_variants && product.variants.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {product.variants.map((variant) => (
                                                <li
                                                    key={variant.id}
                                                    className="text-muted-foreground flex items-center justify-between gap-4 text-sm"
                                                >
                                                    <span>{variant.name}</span>
                                                    <span className="font-medium">{formatCurrency(variant.price)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {!product.has_variants && (
                                        <span className="text-muted-foreground text-sm font-medium">
                                            {formatCurrency(product.price)}
                                        </span>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        onClick={() => onEditProduct(product)}
                                        aria-label={`Editar ${product.name}`}
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>

            <CardFooter>
                <Button variant="outline" size="sm" onClick={() => onAddProduct(category.id)}>
                    <Plus className="size-4" />
                    Agregar producto
                </Button>
            </CardFooter>
        </Card>
    );
}
