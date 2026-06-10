import { Head, router } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { CartDrawer } from '@/components/storefront/CartDrawer';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { saveCartForCheckout } from '@/lib/cart-storage';
import { useNamedRoute } from '@/lib/ziggy';
import PublicLayout from '@/layouts/PublicLayout';
import { type Category, type PublicOrganization } from '@/types';

interface StorefrontProps {
    organization: PublicOrganization;
    categories: Category[];
}

export default function Storefront({ organization, categories }: StorefrontProps) {
    const [cartOpen, setCartOpen] = useState(false);
    const cart = useCart(organization.id);
    const namedRoute = useNamedRoute();

    const handleCheckout = () => {
        saveCartForCheckout({
            organizationId: organization.id,
            organizationSlug: organization.slug,
            items: cart.items,
        });
        setCartOpen(false);
        router.visit(namedRoute('storefront.checkout', organization.slug));
    };

    return (
        <PublicLayout organization={organization}>
            <Head title={organization.name} />

            <div className="flex flex-col gap-8 pb-24">
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
                                        <ProductCard product={product} onAdd={cart.addItem} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))
                )}
            </div>

            {!cart.isEmpty && (
                <Button
                    type="button"
                    size="lg"
                    className="fixed right-4 bottom-6 z-20 h-14 rounded-full px-5 shadow-lg"
                    onClick={() => setCartOpen(true)}
                >
                    <ShoppingCart className="size-5" />
                    <span className="font-semibold">Ver pedido</span>
                    <Badge variant="secondary" className="ml-1 min-w-6 justify-center rounded-full px-2">
                        {cart.totalItems}
                    </Badge>
                </Button>
            )}

            <CartDrawer
                open={cartOpen}
                onOpenChange={setCartOpen}
                items={cart.items}
                subtotal={cart.subtotal}
                isEmpty={cart.isEmpty}
                onIncrement={cart.incrementItem}
                onDecrement={cart.decrementItem}
                onRemove={cart.removeItem}
                onCheckout={handleCheckout}
            />
        </PublicLayout>
    );
}
