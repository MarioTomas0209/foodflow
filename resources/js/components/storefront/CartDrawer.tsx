import { Minus, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/format-currency';
import { type CartItem } from '@/types';
import { ProductThumbnail } from '@/components/storefront/ProductThumbnail';

interface CartDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: CartItem[];
    subtotal: number;
    isEmpty: boolean;
    stockMessage: string | null;
    onIncrement: (productId: string, variantId: string | null) => boolean;
    onDecrement: (productId: string, variantId: string | null) => void;
    onRemove: (productId: string, variantId: string | null) => void;
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
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Tu pedido</SheetTitle>
                    <SheetDescription>Revisa los productos antes de continuar.</SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
                    {stockMessage && (
                        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">{stockMessage}</p>
                    )}
                    {isEmpty ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">Tu carrito está vacío.</p>
                    ) : (
                        <ul className="flex flex-col gap-4">
                            {items.map((item) => {
                                const atMaxStock =
                                    item.maxStock !== null && item.quantity >= item.maxStock;

                                return (
                                <li
                                    key={`${item.productId}:${item.variantId ?? 'base'}`}
                                    className="flex flex-col gap-3"
                                >
                                    <div className="flex items-start gap-3">
                                        <ProductThumbnail
                                            image={item.productImage}
                                            name={item.productName}
                                            className="size-14 rounded-xl"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium">{item.productName}</p>
                                                    {item.variantName && (
                                                        <p className="text-muted-foreground text-sm">{item.variantName}</p>
                                                    )}
                                                    <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                                                        {formatCurrency(item.price)} c/u
                                                        {item.maxStock !== null && (
                                                            <span className="ml-2">· máx. {item.maxStock}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                                    onClick={() => onRemove(item.productId, item.variantId)}
                                                    aria-label={`Eliminar ${item.productName}`}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <div className="bg-muted flex items-center rounded-lg p-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                onClick={() => onDecrement(item.productId, item.variantId)}
                                                aria-label="Disminuir cantidad"
                                            >
                                                <Minus className="size-4" />
                                            </Button>
                                            <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-8"
                                                disabled={atMaxStock}
                                                onClick={() => onIncrement(item.productId, item.variantId)}
                                                aria-label="Aumentar cantidad"
                                            >
                                                <Plus className="size-4" />
                                            </Button>
                                        </div>
                                        <span className="font-semibold tabular-nums">
                                            {formatCurrency(item.price * item.quantity)}
                                        </span>
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <SheetFooter className="mt-auto flex-col gap-4 sm:flex-col sm:space-x-0">
                    <Separator />
                    <div className="flex w-full items-center justify-between">
                        <span className="text-muted-foreground text-sm">Subtotal</span>
                        <span className="text-lg font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                    <Button
                        type="button"
                        size="lg"
                        className="w-full rounded-xl"
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
