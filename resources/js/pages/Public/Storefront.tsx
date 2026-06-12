import { Head, router } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CartDrawer } from '@/components/storefront/CartDrawer';
import { CategoryNav } from '@/components/storefront/CategoryNav';
import { DailyMenuSection } from '@/components/storefront/DailyMenuSection';
import { ProductCard } from '@/components/storefront/ProductCard';
import { StorefrontHours } from '@/components/storefront/StorefrontHours';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { validateCartAgainstCatalog } from '@/lib/cart-stock';
import {
    formatCategoryAvailabilityMessage,
    isCategoryScheduleBannerWarning,
    shouldShowCategoryScheduleBanner,
} from '@/lib/category-schedule';
import { saveCartForCheckout } from '@/lib/cart-storage';
import { cn } from '@/lib/utils';
import { useNamedRoute } from '@/lib/ziggy';
import PublicLayout from '@/layouts/PublicLayout';
import { type CartSource, type Category, type DailyMenu, type PublicOrganization } from '@/types';

function getStorefrontScrollOffset(): number {
    const header = document.getElementById('public-storefront-header');
    const categoryNav = document.getElementById('public-category-nav');
    const headerHeight = header?.offsetHeight ?? 0;
    const navHeight = categoryNav?.offsetHeight ?? 0;

    return headerHeight + navHeight + 8;
}

interface StorefrontProps {
    organization: PublicOrganization;
    daily_menu: DailyMenu | null;
    categories: Category[];
}

export default function Storefront({ organization, daily_menu, categories }: StorefrontProps) {
    const [cartOpen, setCartOpen] = useState(false);
    const [stockMessage, setStockMessage] = useState<string | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(categories[0]?.id ?? null);
    const cart = useCart(organization.id);
    const namedRoute = useNamedRoute();

    const scrollToCategory = useCallback((id: string) => {
        const el = document.getElementById(`category-${id}`);

        if (!el) {
            return;
        }

        setActiveCategoryId(id);

        const top = el.getBoundingClientRect().top + window.scrollY - getStorefrontScrollOffset();

        window.scrollTo({ top, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        const observers: IntersectionObserver[] = [];

        categories.forEach((category) => {
            const el = document.getElementById(`category-${category.id}`);

            if (!el) {
                return;
            }

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveCategoryId(category.id);
                    }
                },
                {
                    rootMargin: '-20% 0px -70% 0px',
                    threshold: 0,
                },
            );

            observer.observe(el);
            observers.push(observer);
        });

        return () => observers.forEach((observer) => observer.disconnect());
    }, [categories]);

    const handleCheckout = () => {
        const validationError = validateCartAgainstCatalog(cart.items, categories, daily_menu);

        if (validationError) {
            setStockMessage(validationError);
            return;
        }

        setStockMessage(null);
        saveCartForCheckout({
            organizationId: organization.id,
            organizationSlug: organization.slug,
            items: cart.items,
        });
        setCartOpen(false);
        router.visit(namedRoute('storefront.checkout', organization.slug));
    };

    const handleIncrement = (productId: string, variantId: string | null, source: CartSource = 'menu') => {
        const incremented = cart.incrementItem(productId, variantId, source);

        if (!incremented) {
            setStockMessage('Ya agregaste el máximo disponible de ese producto.');
        } else {
            setStockMessage(null);
        }

        return incremented;
    };

    return (
        <PublicLayout organization={organization}>
            <Head title={organization.name} />

            <div className="flex flex-col gap-6 pb-24">
                {organization.hours && organization.hours.length > 0 && (
                    <StorefrontHours
                        hours={organization.hours}
                        isOpenNow={organization.is_open_now ?? true}
                    />
                )}

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

                {daily_menu && daily_menu.items.length > 0 && (
                    <DailyMenuSection
                        dailyMenu={daily_menu}
                        getQuantityInCart={cart.getQuantity}
                        onAdd={cart.addItem}
                    />
                )}

                {categories.length > 0 && (
                    <div
                        id="public-category-nav"
                        className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-36 z-[9] -mx-4 border-b px-4 py-3 backdrop-blur sm:top-[4.5rem]"
                    >
                        <CategoryNav
                            categories={categories}
                            activeCategoryId={activeCategoryId}
                            onSelect={scrollToCategory}
                        />
                    </div>
                )}

                {categories.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center text-base">
                        Este menú aún no tiene productos disponibles.
                    </p>
                ) : (
                    categories.map((category) => {
                        const scheduleMessage = formatCategoryAvailabilityMessage(category);
                        const showScheduleBanner = shouldShowCategoryScheduleBanner(category);
                        const scheduleBannerIsWarning = isCategoryScheduleBannerWarning(category);

                        return (
                        <section
                            key={category.id}
                            id={`category-${category.id}`}
                            className="scroll-mt-44 space-y-4 sm:scroll-mt-[7.5rem]"
                        >
                            <div>
                                <h2 className="text-xl font-semibold">{category.name}</h2>
                                {category.description && (
                                    <p className="text-muted-foreground mt-1 text-sm">{category.description}</p>
                                )}
                            </div>

                            {showScheduleBanner && scheduleMessage && (
                                <div
                                    className={cn(
                                        'rounded-xl border px-4 py-3 text-sm',
                                        scheduleBannerIsWarning
                                            ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
                                            : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200',
                                    )}
                                >
                                    {scheduleMessage}
                                    {category.schedule_type === 'informative' && !category.is_available_now && (
                                        <span className="mt-1 block text-xs opacity-90">
                                            Puedes hacer tu pedido ahora; la comida estará lista en este horario.
                                        </span>
                                    )}
                                </div>
                            )}

                            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {category.products.map((product) => (
                                    <li key={product.id} className="min-h-0">
                                        <ProductCard
                                            product={product}
                                            categoryAvailable={category.can_order_now}
                                            getQuantityInCart={cart.getQuantity}
                                            onAdd={cart.addItem}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </section>
                        );
                    })
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
                stockMessage={stockMessage}
                onIncrement={handleIncrement}
                onDecrement={cart.decrementItem}
                onRemove={cart.removeItem}
                onCheckout={handleCheckout}
            />
        </PublicLayout>
    );
}
