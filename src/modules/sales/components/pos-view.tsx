"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatSoles } from "@/lib/money";
import { cartTotal } from "@/lib/sales";
import { useActiveShift } from "@/modules/cash/hooks/use-cash";
import { useCartStore } from "../store/cart-store";
import { CartTable } from "./cart-table";
import { PaymentDialog } from "./payment-dialog";
import { PrescriptionDialog } from "./prescription-dialog";
import { ProductCatalog } from "./product-catalog";

export function PosView({ proofEnabled, readerEnabled, openPrescription }: { proofEnabled: boolean; readerEnabled: boolean; openPrescription: boolean }) {
  const router = useRouter();
  const { data, isLoading, error } = useActiveShift();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const [paying, setPaying] = useState(false);
  const [prescribing, setPrescribing] = useState(openPrescription);
  const stale = data?.shift?.stale ?? false;
  const hasItems = items.length > 0;

  // Viene de «Receta» en el Inicio del cajero (`?receta=1`): el parámetro ya cumplió su función, se quita de la dirección.
  useEffect(() => {
    if (openPrescription) router.replace("/pos", { scroll: false });
  }, [openPrescription, router]);

  // Atajos: F2 cobra (con productos y el turno al día), F4 abre la receta. No actúan con un diálogo abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F2" && e.key !== "F4") return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      if (e.key === "F2" && hasItems && !stale) setPaying(true);
      if (e.key === "F4") setPrescribing(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasItems, stale]);

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
      {data.shift.stale && (
        <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive lg:col-span-2">
          <p className="font-semibold">Tu turno de caja es de un día anterior</p>
          <p className="mt-1 text-sm">
            No se puede vender hasta cerrarlo.{" "}
            <Link href="/caja" className="font-medium underline">
              Ir a Caja
            </Link>
          </p>
        </div>
      )}
      <ProductCatalog onPrescription={() => setPrescribing(true)} />

      <aside aria-label="Venta actual" className="flex flex-col card-surface lg:sticky lg:top-4">
        <div className="flex items-center justify-between border-b px-4 py-1">
          <h2 className="flex items-center gap-2 text-base font-bold">
            Venta actual
            {hasItems && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">{items.length} {items.length === 1 ? "producto" : "productos"}</span>}
          </h2>
          <Button variant="ghost" size="sm" className="text-destructive" disabled={items.length === 0} onClick={clear}>
            Vaciar
          </Button>
        </div>
        <div className="max-h-[44vh] overflow-y-auto px-4">
          <CartTable />
        </div>
        <div className="flex flex-col gap-3 rounded-b-2xl bg-muted/50 p-4">
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
          <Button variant="success" size="lg" className="h-12 gap-3 text-base font-extrabold" disabled={!hasItems || stale} onClick={() => setPaying(true)}>
            Cobrar {formatSoles(total)}
            <kbd className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold">F2</kbd>
          </Button>
          <p className="text-[11px] text-muted-foreground">Turno abierto · apertura {formatSoles(data.shift.openingAmount)}</p>
        </div>
      </aside>

      {prescribing && <PrescriptionDialog readerEnabled={readerEnabled} onClose={() => setPrescribing(false)} />}
      {paying && <PaymentDialog total={total} proofEnabled={proofEnabled} onClose={() => setPaying(false)} />}
    </div>
  );
}
