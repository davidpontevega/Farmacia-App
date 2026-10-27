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
import { ProductCatalog } from "./product-catalog";

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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <ProductCatalog />

      <aside aria-label="Venta actual" className="flex flex-col rounded-2xl border bg-card lg:sticky lg:top-4">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-bold">Venta actual</h2>
          <Button variant="ghost" className="h-11 text-destructive" disabled={items.length === 0} onClick={clear}>
            Vaciar
          </Button>
        </div>
        <div className="max-h-[48vh] overflow-y-auto px-5">
          <CartTable />
        </div>
        <div className="flex flex-col gap-4 rounded-b-2xl bg-muted/50 p-5">
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatSoles(total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Descuento</span>
              <span className="tabular-nums">{formatSoles(0)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between border-t pt-3 text-foreground">
              <span className="font-semibold">Total</span>
              <span className="text-3xl font-bold tracking-tight tabular-nums">{formatSoles(total)}</span>
            </div>
          </div>
          <Button variant="success" size="lg" className="h-14 text-lg font-bold" disabled={items.length === 0} onClick={() => setPaying(true)}>
            Cobrar {formatSoles(total)}
          </Button>
          <p className="text-xs text-muted-foreground">Turno abierto · apertura {formatSoles(data.shift.openingAmount)}</p>
        </div>
      </aside>

      {paying && <PaymentDialog total={total} onClose={() => setPaying(false)} />}
    </div>
  );
}
