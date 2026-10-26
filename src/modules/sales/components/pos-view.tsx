"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatSoles } from "@/lib/money";
import { cartTotal } from "@/lib/sales";
import { useActiveShift } from "@/modules/cash/hooks/use-cash";
import { useCartStore } from "../store/cart-store";
import { CartTable } from "./cart-table";
import { PaymentDialog } from "./payment-dialog";
import { ProductSearch } from "./product-search";

export function PosView() {
  const { data, isLoading, error } = useActiveShift();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const [paying, setPaying] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) return <p className="text-destructive">{apiErrorMessage(error)}</p>;

  if (data.shift === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-muted-foreground">No hay turno de caja abierto</p>
        <Link href="/caja" className="text-sm text-primary hover:underline">
          Ir a abrir turno
        </Link>
      </div>
    );
  }

  const total = cartTotal(items);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="flex min-h-[60vh] flex-col gap-4">
        <ProductSearch />
        <CartTable />
      </div>

      <aside className="flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">Resumen</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatSoles(total)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Descuento</span>
            <span>{formatSoles(0)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatSoles(total)}</span>
          </div>
        </div>

        <Button size="lg" disabled={items.length === 0} onClick={() => setPaying(true)}>
          Cobrar {formatSoles(total)}
        </Button>
        <Button variant="outline" disabled={items.length === 0} onClick={clear}>
          Limpiar carrito
        </Button>

        <p className="border-t pt-3 text-xs text-muted-foreground">
          Turno abierto · apertura {formatSoles(data.shift.openingAmount)}
        </p>
      </aside>

      {paying && <PaymentDialog total={total} onClose={() => setPaying(false)} />}
    </div>
  );
}
