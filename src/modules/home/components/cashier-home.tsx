"use client";

import { ClipboardList, Receipt, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate, formatDateTime, todayLima } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { Can } from "@/modules/auth/components/can";
import { useActiveShift, useLocalOpenShift } from "@/modules/cash/hooks/use-cash";
import { useShiftSales } from "@/modules/sales/hooks/use-sales";
import { PAYMENT_LABEL } from "@/modules/sales/types";

const card = "card-surface p-4";

function Access({ href, icon: Icon, title, hint, tone }: { href: string; icon: typeof ShoppingCart; title: string; hint: string; tone: "success" | "primary" | "plain" }) {
  const styles = {
    success: "bg-success text-primary-foreground hover:bg-success/90",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    plain: "border bg-card text-foreground hover:bg-muted/60",
  }[tone];
  return (
    <Link href={href} className={cn("flex items-center gap-3 rounded-2xl p-4 shadow-sm transition-colors", styles)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone === "plain" ? "bg-secondary text-primary" : "bg-white/20")} aria-hidden="true">
        <Icon className="size-6" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold">{title}</span>
        <span className={cn("text-sm", tone === "plain" ? "text-muted-foreground" : "opacity-90")}>{hint}</span>
      </span>
    </Link>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: "plain" | "blue" | "green" }) {
  const box = { plain: "bg-muted text-foreground", blue: "bg-secondary text-secondary-foreground", green: "bg-success-soft text-success" }[tone];
  return (
    <div className={cn("rounded-xl px-3.5 py-3", box)}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="mt-0.5 text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function MyShift() {
  const active = useActiveShift();
  const hasOwn = active.data?.shift != null;
  const local = useLocalOpenShift(!active.isLoading && !hasOwn);
  if (active.isLoading) return <Skeleton className="h-64 w-full" />;
  if (active.error || !active.data) return <p role="alert" className="text-destructive">{apiErrorMessage(active.error)}</p>;

  if (active.data.shift === null) {
    const other = local.data;
    return (
      <section className={cn(card, "flex flex-col gap-3")}>
        <h2 className="text-base font-bold">Mi turno</h2>
        <p className="text-sm text-muted-foreground">
          {other ? <>La caja está abierta por <strong className="text-foreground">{other.ownerName}</strong> desde {formatDateTime(other.openedAt)}. Cuando cierre, podrás abrir tu turno.</> : "No tienes un turno abierto. Ábrelo para empezar a vender."}
        </p>
        <Link href="/caja" className="flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition-colors hover:bg-muted">Ir a Caja</Link>
      </section>
    );
  }

  const { shift, summary } = active.data;
  return (
    <section className={cn(card, "flex flex-col gap-3.5")}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Mi turno</h2>
        <Badge variant={shift.stale ? "destructive" : "success"} className="font-bold">{shift.stale ? "Vencido" : "Abierto"}</Badge>
      </div>
      {shift.stale && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-3 text-sm font-medium text-destructive">
          Tu turno es del {formatDate(todayLima(new Date(shift.openedAt)))}. Cuenta el dinero y ciérralo en Caja para seguir vendiendo.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="Apertura" value={formatSoles(shift.openingAmount)} tone="plain" />
        <Tile label="Ventas" value={String(summary.salesCount)} tone="plain" />
        <Tile label="Efectivo esperado" value={formatSoles(summary.expectedCash)} tone="blue" />
        <Tile label="Yape / Plin esperado" value={formatSoles(summary.expectedYape)} tone="green" />
      </div>
      <div className="mt-auto flex flex-wrap gap-2.5">
        <Link href="/caja" className="flex h-11 min-w-28 flex-1 items-center justify-center rounded-xl border text-sm font-bold transition-colors hover:bg-muted">Retiro</Link>
        <Link href="/caja" className="flex h-11 min-w-28 flex-1 items-center justify-center rounded-xl border text-sm font-bold transition-colors hover:bg-muted">Canje Yape</Link>
        <Link href="/caja" className="flex h-11 min-w-32 flex-1 items-center justify-center rounded-xl border border-destructive text-sm font-bold text-destructive transition-colors hover:bg-destructive/10">Cerrar turno</Link>
      </div>
    </section>
  );
}

function ShiftSales({ proofEnabled }: { proofEnabled: boolean }) {
  const { data, isLoading, error } = useShiftSales();
  return (
    <section className={cn(card, "min-w-0")}>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-bold">Ventas del turno</h2>
        <Link href="/caja" className="text-sm font-semibold text-primary hover:underline">Ver todas</Link>
      </div>
      {isLoading && <Skeleton className="h-32 w-full" />}
      {error && <p role="alert" className="text-destructive">{apiErrorMessage(error)}</p>}
      {data && data.length === 0 && <EmptyState icon={Receipt} title="Aún no hay ventas en este turno" description="Cuando cobres, aparecerán aquí." />}
      {data && data.length > 0 && (
        <ul className="flex flex-col">
          {data.slice(0, 6).map((s) => (
            <li key={s.id} className="flex min-h-14 items-center gap-3.5 border-t first:border-t-0">
              <span className="flex flex-1 flex-col leading-tight">
                <span className={cn("text-sm font-bold", s.status === "VOIDED" && "line-through")}>{s.ticketNumber}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</span>
              </span>
              <Badge variant="info" className="font-bold">{PAYMENT_LABEL[s.paymentMethod]}</Badge>
              {proofEnabled && s.status === "COMPLETED" && s.yapeAmount > 0 && !s.hasProof && <Badge variant="warning" className="font-bold">Sin constancia</Badge>}
              <span className="min-w-20 text-right font-extrabold tabular-nums">{formatSoles(s.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CashierHome({ proofEnabled }: { proofEnabled: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Accesos rápidos" className="grid gap-4 md:grid-cols-3">
        <Can permission="sales.create">
          <Access href="/pos" icon={ShoppingCart} title="Nueva venta" hint="Abre el punto de venta" tone="success" />
          <Access href="/pos?receta=1" icon={ClipboardList} title="Receta" hint="Pasa la lista al carrito" tone="primary" />
        </Can>
        <Can permission="products.read">
          <Access href="/consulta" icon={Search} title="Consultar" hint="Qué hay para un síntoma" tone="plain" />
        </Can>
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Can permission="cash.read">
          <MyShift />
          <ShiftSales proofEnabled={proofEnabled} />
        </Can>
      </div>
    </div>
  );
}
