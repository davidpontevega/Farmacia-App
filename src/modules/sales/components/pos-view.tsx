"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { cartTotal } from "@/lib/sales";
import { useActiveShift } from "@/modules/cash/hooks/use-cash";
import { useCartStore } from "../store/cart-store";
import { CartBar } from "./cart-bar";
import { CartPanel } from "./cart-panel";
import type { TicketData } from "@/lib/ticket";
import { PaymentDialog } from "./payment-dialog";
import { SaleTicketDialog } from "./sale-ticket-dialog";
import { PrescriptionDialog } from "./prescription-dialog";
import { ProductCatalog } from "./product-catalog";

const DESKTOP = "(min-width: 1024px)";
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function PosView({ proofEnabled, readerEnabled, openPrescription }: { proofEnabled: boolean; readerEnabled: boolean; openPrescription: boolean }) {
  const router = useRouter();
  const { data, isLoading, error } = useActiveShift();
  const items = useCartStore((s) => s.items);
  const [paying, setPaying] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  // El foco entra al panel (no a «Vaciar», que es destructivo y es lo primero al tabular).
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDesktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => false);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [prescribing, setPrescribing] = useState(openPrescription);
  const stale = data?.shift?.stale ?? false;
  const hasItems = items.length > 0;

  // El panel del celular se cierra solo si el carrito queda vacío (se vació o se vendió) o si la pantalla pasa a escritorio.
  if (cartOpen && (!hasItems || isDesktop)) setCartOpen(false);

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
    <div className="grid gap-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:pb-0">
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

      <aside aria-label="Venta actual" className="card-surface hidden flex-col lg:sticky lg:top-4 lg:flex">
        <CartPanel openingAmount={data.shift.openingAmount} stale={stale} onPay={() => setPaying(true)} />
      </aside>

      {!paying && !prescribing && !ticket && <CartBar stale={stale} onOpen={() => setCartOpen(true)} onPay={() => setPaying(true)} />}
      {!isDesktop && (
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetContent ref={sheetRef} side="bottom" initialFocus={sheetRef} className="max-h-[85dvh] gap-0">
            <CartPanel openingAmount={data.shift.openingAmount} stale={stale} inSheet onPay={() => { setCartOpen(false); setPaying(true); }} />
          </SheetContent>
        </Sheet>
      )}

      {prescribing && <PrescriptionDialog readerEnabled={readerEnabled} onClose={() => setPrescribing(false)} />}
      {paying && <PaymentDialog total={total} proofEnabled={proofEnabled} onSold={setTicket} onClose={() => setPaying(false)} />}
      {ticket && <SaleTicketDialog ticket={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
