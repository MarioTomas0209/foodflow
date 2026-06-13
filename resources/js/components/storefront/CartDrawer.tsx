import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/format-currency';
import { storefrontAccent } from '@/lib/storefront-theme';
import { cn } from '@/lib/utils';
import { type CartItem, type CartSource } from '@/types';

interface CartDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: CartItem[];
    subtotal: number;
    isEmpty: boolean;
    stockMessage: string | null;
    onIncrement: (productId: string, variantId: string | null, source?: CartSource) => boolean;
    onDecrement: (productId: string, variantId: string | null, source?: CartSource) => void;
    onRemove: (productId: string, variantId: string | null, source?: CartSource) => void;
    onCheckout: () => void;
}

export function CartDrawer({
    open,
    onOpenChange,
    items,
    subtotal,
    isEmpty,
    stockMessage,
    onIncrement,
    onDecrement,
    onRemove,
    onCheckout,
}: CartDrawerProps) {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-border space-y-1 border-b px-4 py-4 text-left">
                    <SheetTitle className="text-xl font-bold">Tu pedido</SheetTitle>
                    <SheetDescription>
                        {isEmpty
                            ? 'Agrega productos del menú para continuar.'
                            : `${itemCount} ${itemCount === 1 ? 'producto' : 'productos'} en tu carrito`}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                    {stockMessage && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                            {stockMessage}
                        </p>
                    )}

                    {isEmpty ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                            <div className="bg-muted flex size-14 items-center justify-center rounded-full">
                                <ShoppingBag className="text-muted-foreground size-7" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold">Tu carrito está vacío</p>
                                <p className="text-muted-foreground text-sm">
                                    Explora el menú y agrega lo que se te antoje.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {items.map((item) => {
                                const atMaxStock =
                                    item.maxStock !== null && item.quantity >= item.maxStock;

                                return (
                                    <li
                                        key={`${item.source}:${item.productId}:${item.variantId ?? 'base'}`}
                                        className="border-border bg-card rounded-2xl border p-3 shadow-sm"
                                    >
                                        <div className="flex gap-3">
                                            <ProductThumbnail
                                                image={item.productImage}
                                                name={item.productName}
                                                className="size-16 rounded-xl"
                                            />

                                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="font-bold leading-snug">{item.productName}</p>
                                                        {item.variantName && (
                                                            <p className="text-muted-foreground text-sm">
                                                                {item.variantName}
                                                            </p>
                                                        )}
                                                        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                                                            {formatCurrency(item.price)} c/u
                                                            {item.maxStock !== null && (
                                                                <span className="ml-1.5">· máx. {item.maxStock}</span>
                                                            )}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="text-muted-foreground hover:text-destructive shrink-0 rounded-full p-1 transition-colors"
                                                        onClick={() =>
                                                            onRemove(item.productId, item.variantId, item.source)
                                                        }
                                                        aria-label={`Eliminar ${item.productName}`}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="border-border flex items-center rounded-full border p-0.5">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 rounded-full"
                                                            onClick={() =>
                                                                onDecrement(
                                                                    item.productId,
                                                                    item.variantId,
                                                                    item.source,
                                                                )
                                                            }
                                                            aria-label="Disminuir cantidad"
                                                        >
                                                            <Minus className="size-3.5" />
                                                        </Button>
                                                        <span className="min-w-8 text-center text-sm font-bold tabular-nums">
                                                            {item.quantity}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                'size-8 rounded-full',
                                                                !atMaxStock && storefrontAccent.text,
                                                            )}
                                                            disabled={atMaxStock}
                                                            onClick={() =>
                                                                onIncrement(
                                                                    item.productId,
                                                                    item.variantId,
                                                                    item.source,
                                                                )
                                                            }
                                                            aria-label="Aumentar cantidad"
                                                        >
                                                            <Plus className="size-3.5" />
                                                        </Button>
                                                    </div>

                                                    <p
                                                        className={cn(
                                                            'text-sm font-bold tabular-nums',
                                                            storefrontAccent.text,
                                                        )}
                                                    >
                                                        {formatCurrency(item.price * item.quantity)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <SheetFooter className="border-border mt-auto flex-col gap-4 border-t px-4 py-4 sm:flex-col sm:space-x-0">
                    <div className="flex w-full items-center justify-between">
                        <span className="text-muted-foreground text-sm font-medium">Subtotal</span>
                        <span className={cn('text-xl font-bold tabular-nums', storefrontAccent.text)}>
                            {formatCurrency(subtotal)}
                        </span>
                    </div>

                    <Button
                        type="button"
                        size="lg"
                        className={cn('h-12 w-full rounded-full text-base font-semibold', storefrontAccent.button)}
                        disabled={isEmpty}
                        onClick={onCheckout}
                    >
                        Continuar con el pedido
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
