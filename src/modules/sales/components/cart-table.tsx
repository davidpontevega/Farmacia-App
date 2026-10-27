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
        <li key={i.productId} className="flex items-center gap-2 border-b py-2 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight">{i.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Button variant="outline" size="icon" className="size-6 rounded-md" aria-label={`Quitar una unidad de ${i.name}`} onClick={() => setQuantity(i.productId, i.quantity - 1)}>
                <Minus className="size-3" />
              </Button>
              <span className="w-5 text-center font-semibold tabular-nums text-foreground" aria-live="polite">
                {i.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-6 rounded-md"
                aria-label={`Agregar una unidad de ${i.name}`}
                disabled={i.quantity >= i.stock}
                onClick={() => setQuantity(i.productId, i.quantity + 1)}
              >
                <Plus className="size-3" />
              </Button>
              <span className="ml-1 tabular-nums">× {formatSoles(i.unitPrice)}</span>
            </p>
          </div>
          <span className="text-[13px] font-semibold tabular-nums">{formatSoles(i.unitPrice * i.quantity)}</span>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label={`Quitar ${i.name} del carrito`} onClick={() => remove(i.productId)}>
            <X className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
