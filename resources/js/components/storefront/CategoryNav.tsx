import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { storefrontAccent } from '@/lib/storefront-theme';
import { type Category } from '@/types';

interface CategoryNavProps {
    categories: Category[];
    activeCategoryId: string | null;
    onSelect: (id: string) => void;
}

export function CategoryNav({ categories, activeCategoryId, onSelect }: CategoryNavProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!activeCategoryId || !scrollRef.current) {
            return;
        }

        const tabEl = scrollRef.current.querySelector<HTMLElement>(`[data-category-tab="${activeCategoryId}"]`);

        tabEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [activeCategoryId]);

    if (categories.length === 0) {
        return null;
    }

    return (
        <nav
            ref={scrollRef}
            className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4"
            aria-label="Categorías del menú"
        >
            {categories.map((category) => {
                const isActive = activeCategoryId === category.id;

                return (
                    <button
                        key={category.id}
                        type="button"
                        data-category-tab={category.id}
                        onClick={() => onSelect(category.id)}
                        className={cn(
                            'shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
                            isActive
                                ? cn(storefrontAccent.pill, 'shadow-sm')
                                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        {category.name}
                    </button>
                );
            })}
        </nav>
    );
}
