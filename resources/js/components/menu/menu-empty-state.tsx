import { FolderOpen, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface MenuEmptyStateProps {
    onCreateCategory: () => void;
}

export function MenuEmptyState({ onCreateCategory }: MenuEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <FolderOpen className="text-muted-foreground mb-4 size-16 stroke-1" />
            <h2 className="text-lg font-semibold">Aún no tienes categorías</h2>
            <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                Crea tu primera categoría para empezar a agregar productos
            </p>
            <Button className="mt-6" onClick={onCreateCategory}>
                <Plus className="size-4" />
                Crear primera categoría
            </Button>
        </div>
    );
}
