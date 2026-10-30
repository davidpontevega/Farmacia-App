"use client";

import { Button } from "@/components/ui/button";
import { SheetTitle } from "@/components/ui/sheet";
import { formatSoles } from "@/lib/money";
import { cartCountLabel, cartTotal } from "@/lib/sales";
import { useCartStore } from "../store/cart-store";
import { CartTable } from "./cart-table";

/** «Venta actual»: líneas, total y Cobrar. Lo usan la columna de escritorio y el panel del celular. */
export function CartPanel({ openingAmount, stale, inSheet = false, onPay }: { openingAmount: number; stale: boolean; inSheet?: boolean; onPay: () => void }) {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const hasItems = items.length > 0;
  const total = cartTotal(items);
  const heading = "flex items-center gap-2 text-base font-bold";
  const count = hasItems && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">{cartCountLabel(items.length)}</span>;

  return (
    <>
      <div className={`flex items-center justify-between border-b px-4 py-1 ${inSheet ? "pr-14" : ""}`}>
        {inSheet ? (
          <span className={heading}>
            <SheetTitle className="text-base font-bold">Venta actual</SheetTitle>
            {count}
          </span>
        ) : (
          <h2 className={heading}>Venta actual {count}</h2>
        )}
        <Button variant="ghost" size="sm" className="text-destructive" disabled={!hasItems} onClick={clear}>
          Vaciar
        </Button>
      </div>
      <div className={inSheet ? "min-h-0 flex-1 overflow-y-auto px-4" : "max-h-[44vh] overflow-y-auto px-4"}>
        <CartTable />
      </div>
      <div className={`flex flex-col gap-3 rounded-b-2xl bg-muted/50 p-4 ${inSheet ? "pb-[max(1rem,env(safe-area-inset-bottom))]" : ""}`}>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatSoles(total)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t pt-2 text-foreground">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-3xl font-extrabold tracking-tight tabular-nums">{formatSoles(total)}</span>
          </div>
        </div>
        <Button variant="success" size="lg" className="h-12 gap-3 text-base font-extrabold" disabled={!hasItems || stale} onClick={onPay}>
          Cobrar {formatSoles(total)}
          <kbd className="hidden rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold lg:inline">F2</kbd>
        </Button>
        <p className="text-[11px] text-muted-foreground">Turno abierto · apertura {formatSoles(openingAmount)}</p>
      </div>
    </>
  );
}
