import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface MenuHeaderProps {
    showNewButton: boolean;
    onNewCategory: () => void;
}

export function MenuHeader({ showNewButton, onNewCategory }: MenuHeaderProps) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Menú</h1>
                <p className="text-muted-foreground mt-1 text-sm">Administra las categorías y productos de tu negocio</p>
            </div>
            {showNewButton && (
                <Button onClick={onNewCategory}>
                    <Plus className="size-4" />
                    Nueva categoría
                </Button>
            )}
        </div>
    );
}
