"use client";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSoles } from "@/lib/money";
import { useCartStore } from "../store/cart-store";

/** Líneas del carrito: nombre, cantidad con − / + y total de la línea. */
export function CartTable() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Agrega productos al carrito</p>;
  }

  return (
    <ul className="flex flex-col">
      {items.map((i) => (
        <li key={i.productId} className="flex items-center gap-3 border-b py-3 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{i.name}</p>
            <p className="text-xs text-muted-foreground">{formatSoles(i.unitPrice)} c/u</p>
            <div className="mt-2 flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-9" aria-label={`Quitar una unidad de ${i.name}`} onClick={() => setQuantity(i.productId, i.quantity - 1)}>
                <Minus />
              </Button>
              <span className="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                {i.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                aria-label={`Agregar una unidad de ${i.name}`}
                disabled={i.quantity >= i.stock}
                onClick={() => setQuantity(i.productId, i.quantity + 1)}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatSoles(i.unitPrice * i.quantity)}</span>
          <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={`Quitar ${i.name} del carrito`} onClick={() => remove(i.productId)}>
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}
