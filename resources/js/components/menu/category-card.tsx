import { Clock, Pencil, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { categoryHasSchedule, formatCategoryScheduleSummary, SCHEDULE_TYPE_LABELS } from '@/lib/category-schedule';
import { cn } from '@/lib/utils';
import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { type Category, type Product } from '@/types';

interface CategoryCardProps {
    category: Category;
    onAddProduct: (categoryId: string) => void;
    onEditProduct: (product: Product) => void;
    onEditCategory: (category: Category) => void;
}

export function CategoryCard({ category, onAddProduct, onEditProduct, onEditCategory }: CategoryCardProps) {
    const scheduleSummary = formatCategoryScheduleSummary(category);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    {category.description && <p className="text-muted-foreground text-sm">{category.description}</p>}
                    {categoryHasSchedule(category) && scheduleSummary && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                                <Clock className="size-3.5 shrink-0" />
                                {scheduleSummary}
                            </span>
                            <Badge variant="outline" className="text-xs">
                                {SCHEDULE_TYPE_LABELS[category.schedule_type]}
                            </Badge>
                            {category.schedule_type === 'restricted' && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-xs',
                                        category.is_available_now
                                            ? 'border-green-200 text-green-800 dark:border-green-900 dark:text-green-300'
                                            : 'border-amber-200 text-amber-800 dark:border-amber-900 dark:text-amber-300',
                                    )}
                                >
                                    {category.is_available_now ? 'Disponible ahora' : 'Fuera de horario'}
                                </Badge>
                            )}
                        </div>
                    )}
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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEditCategory(category)}
                        aria-label={`Editar categoría ${category.name}`}
                    >
                        <Pencil className="size-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {category.products.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Sin productos en esta categoría.</p>
                ) : (
                    <ul className="divide-border divide-y">
                        {category.products.map((product) => (
                            <li key={product.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                <ProductThumbnail
                                    image={product.image}
                                    name={product.name}
                                    className="size-12"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-4">
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
                                                            <span className="font-medium">
                                                                {formatCurrency(variant.price)}
                                                            </span>
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
                                    </div>
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
