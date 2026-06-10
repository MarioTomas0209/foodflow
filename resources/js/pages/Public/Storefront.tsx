import { Head } from '@inertiajs/react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/layouts/PublicLayout';
import { formatCurrency } from '@/lib/format-currency';
import { type Category, type PublicOrganization } from '@/types';

interface StorefrontProps {
    organization: PublicOrganization;
    categories: Category[];
}

export default function Storefront({ organization, categories }: StorefrontProps) {
    return (
        <PublicLayout organization={organization}>
            <Head title={organization.name} />

            <div className="flex flex-col gap-8">
                {(organization.description || organization.phone) && (
                    <section className="space-y-2">
                        {organization.description && (
                            <p className="text-muted-foreground text-base leading-relaxed">{organization.description}</p>
                        )}
                        {organization.phone && (
                            <a
                                href={`tel:${organization.phone}`}
                                className="text-primary inline-block text-sm font-medium hover:underline"
                            >
                                {organization.phone}
                            </a>
                        )}
                    </section>
                )}

                {categories.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center text-base">
                        Este menú aún no tiene productos disponibles.
                    </p>
                ) : (
                    categories.map((category) => (
                        <section key={category.id} className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold">{category.name}</h2>
                                {category.description && (
                                    <p className="text-muted-foreground mt-1 text-sm">{category.description}</p>
                                )}
                            </div>

                            <ul className="flex flex-col gap-3">
                                {category.products.map((product) => (
                                    <li key={product.id}>
                                        <Card className="overflow-hidden py-0">
                                            <CardContent className="flex items-start gap-4 p-4">
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div>
                                                        <h3 className="text-base font-semibold">{product.name}</h3>
                                                        {product.description && (
                                                            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {product.has_variants && product.variants.length > 0 ? (
                                                        <ul className="space-y-1.5">
                                                            {product.variants.map((variant) => (
                                                                <li
                                                                    key={variant.id}
                                                                    className="flex items-center justify-between gap-3 text-sm"
                                                                >
                                                                    <span className="text-muted-foreground">{variant.name}</span>
                                                                    <span className="font-semibold tabular-nums">
                                                                        {formatCurrency(variant.price)}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-lg font-semibold tabular-nums">
                                                            {formatCurrency(product.price)}
                                                        </p>
                                                    )}
                                                </div>

                                                <Button type="button" size="lg" className="shrink-0 rounded-xl px-4">
                                                    <Plus className="size-5" />
                                                    Agregar
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))
                )}
            </div>
        </PublicLayout>
    );
}
