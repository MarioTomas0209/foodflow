import { Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { type Category } from '@/types';

interface CategoryCardProps {
    category: Category;
    onAddProduct: (categoryId: string) => void;
}

export function CategoryCard({ category, onAddProduct }: CategoryCardProps) {
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
                            <li key={product.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                <div>
                                    <p className="font-medium">{product.name}</p>
                                    {product.description && (
                                        <p className="text-muted-foreground text-sm">{product.description}</p>
                                    )}
                                </div>
                                <span className="text-muted-foreground text-sm font-medium">{formatCurrency(product.price)}</span>
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
