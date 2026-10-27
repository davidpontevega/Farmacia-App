import { Banknote, Smartphone } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import type { ShiftSummary } from "../types";

function Row({ label, value, tone }: { label: string; value: string; tone?: "plus" | "minus" }) {
  const color = tone === "minus" ? "text-destructive" : tone === "plus" ? "text-success" : "";
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export function ShiftSummaryCard({
  openingAmount,
  openedAt,
  summary: s,
}: {
  openingAmount: number;
  openedAt: string;
  summary: ShiftSummary;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Turno activo</h2>
          <p className="text-xs text-muted-foreground">Abierto {formatDateTime(openedAt)}</p>
        </div>
        <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">Abierto</span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-secondary p-4 text-secondary-foreground">
          <p className="flex items-center gap-2 text-xs font-medium">
            <Banknote className="size-4" aria-hidden="true" />
            Efectivo esperado en gaveta
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatSoles(s.expectedCash)}</p>
        </div>
        <div className="rounded-xl bg-success-soft p-4 text-success">
          <p className="flex items-center gap-2 text-xs font-medium">
            <Smartphone className="size-4" aria-hidden="true" />
            Yape / Plin esperado
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatSoles(s.expectedYape)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Row label="Apertura" value={formatSoles(openingAmount)} />
        <Row label={`Ventas en efectivo (${s.salesCount} ventas en total)`} value={`+ ${formatSoles(s.cashSales)}`} tone="plus" />
        <Row label="Ventas Yape / Plin" value={`+ ${formatSoles(s.yapeSales)}`} tone="plus" />
        {s.withdrawals > 0 && <Row label="Retiros de efectivo" value={`- ${formatSoles(s.withdrawals)}`} tone="minus" />}
        {s.refunds > 0 && <Row label="Devoluciones en efectivo" value={`- ${formatSoles(s.refunds)}`} tone="minus" />}
        {s.exchanges > 0 && <Row label="Canjes Yape→Efectivo" value={`- ${formatSoles(s.exchanges)}`} tone="minus" />}
      </div>
    </section>
  );
}
