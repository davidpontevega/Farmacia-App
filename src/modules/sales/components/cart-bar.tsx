"use client";

import { ChevronUp, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSoles } from "@/lib/money";
import { cartCountLabel, cartTotal } from "@/lib/sales";
import { useCartStore } from "../store/cart-store";

/** Barra fija al pie, solo en celular: cuánto lleva el carrito, abrirlo y cobrar sin recorrer el catálogo. */
export function CartBar({ stale, onOpen, onPay }: { stale: boolean; onOpen: () => void; onPay: () => void }) {
  const items = useCartStore((s) => s.items);
  const total = cartTotal(items);
  const label = cartCountLabel(items.length);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgb(0_0_0/0.08)] lg:hidden">
      <button type="button" onClick={onOpen} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Ver el carrito, ${label}, ${formatSoles(total)}`}>
        <ShoppingCart className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          <span className="text-lg font-extrabold tabular-nums">{formatSoles(total)}</span>
        </span>
        <ChevronUp className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      <span role="status" className="sr-only">
        {label}, {formatSoles(total)}
      </span>
      <Button variant="success" className="h-11 px-6 text-base font-extrabold" disabled={items.length === 0 || stale} onClick={onPay}>
        Cobrar
      </Button>
    </div>
  );
}
