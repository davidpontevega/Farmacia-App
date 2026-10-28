"use client";

import { MapPin, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatSoles } from "@/lib/money";
import { useCartStore } from "../store/cart-store";

const stepper = "flex size-11 items-center justify-center bg-muted text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40";

/** Líneas del carrito: nombre y ubicación, cantidad con − y + (tope: el stock) y total de la línea. */
export function CartTable() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  if (items.length === 0) {
    return <EmptyState icon={ShoppingCart} title="El carrito está vacío" description="Toca un producto para agregarlo." />;
  }

  return (
    <ul className="flex flex-col">
      {items.map((i) => (
        <li key={i.productId} className="flex flex-col gap-2 border-b py-3 last:border-0">
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">{i.name}</p>
              {i.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-secondary-foreground">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {i.location}
                </p>
              )}
            </div>
            <span className="text-base font-extrabold tabular-nums">{formatSoles(i.unitPrice * i.quantity)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center overflow-hidden rounded-xl border">
              <button type="button" className={stepper} aria-label={`Quitar una unidad de ${i.name}`} onClick={() => setQuantity(i.productId, i.quantity - 1)}>
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <span className="min-w-11 text-center text-sm font-extrabold tabular-nums" aria-live="polite">
                {i.quantity}
              </span>
              <button type="button" className={stepper} aria-label={`Agregar una unidad de ${i.name}`} disabled={i.quantity >= i.stock} onClick={() => setQuantity(i.productId, i.quantity + 1)}>
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatSoles(i.unitPrice)} c/u · stock {i.stock}
            </span>
            <button type="button" className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label={`Quitar ${i.name} del carrito`} onClick={() => remove(i.productId)}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
