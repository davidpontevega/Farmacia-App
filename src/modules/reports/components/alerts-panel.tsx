"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { useAlertsReport } from "../hooks/use-reports";

type Item = { key: string; name: string; detail: string; tag: string; tone: "bad" | "warn" };

const TONE = {
  bad: { box: "bg-destructive/10", tag: "text-destructive" },
  warn: { box: "bg-warning-soft", tag: "text-warning" },
} as const;

const MAX_ITEMS = 5;

/** Lo más urgente de Alertas, en pequeño: vencidos, por vencer y stock bajo. */
export function AlertsPanel({ onSeeAll }: { onSeeAll: () => void }) {
  const { data, isLoading, error } = useAlertsReport(30);

  const items: Item[] = data
    ? [
        ...data.expired.map((r): Item => ({
          key: `e${r.lotId}`,
          name: r.name,
          detail: `Lote ${r.lotNumber} · venció ${formatDate(r.expiryDate)}`,
          tag: "Vencido",
          tone: "bad",
        })),
        ...data.lowStock
          .filter((r) => r.stock <= 0)
          .map((r): Item => ({ key: `o${r.productId}`, name: r.name, detail: `Stock 0 · mínimo ${r.minStock}`, tag: "Agotado", tone: "bad" })),
        ...data.expiringSoon.map((r): Item => ({
          key: `s${r.lotId}`,
          name: r.name,
          detail: `Lote ${r.lotNumber} · vence ${formatDate(r.expiryDate)}`,
          tag: r.daysLeft === 0 ? "Vence hoy" : `Vence en ${r.daysLeft} ${r.daysLeft === 1 ? "día" : "días"}`,
          tone: "warn",
        })),
        ...data.lowStock
          .filter((r) => r.stock > 0)
          .map((r): Item => ({ key: `l${r.productId}`, name: r.name, detail: `Stock ${r.stock} · mínimo ${r.minStock}`, tag: "Stock bajo", tone: "warn" })),
      ]
    : [];

  return (
    <section className="flex flex-col gap-3 card-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Alertas</h2>
        <button type="button" onClick={onSeeAll} className="min-h-9 text-sm font-semibold text-secondary-foreground hover:underline">
          Ver todas
        </button>
      </div>
      {isLoading && <Skeleton className="h-40 w-full" />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar las alertas.
        </p>
      )}
      {data && items.length === 0 && <p className="text-sm text-muted-foreground">Sin alertas por ahora.</p>}
      {items.slice(0, MAX_ITEMS).map((a) => (
        <div key={a.key} className={`flex items-center gap-3 rounded-xl p-3 ${TONE[a.tone].box}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{a.name}</p>
            <p className="text-xs text-muted-foreground">{a.detail}</p>
          </div>
          <span className={`whitespace-nowrap text-xs font-bold ${TONE[a.tone].tag}`}>{a.tag}</span>
        </div>
      ))}
      {data && items.length > MAX_ITEMS && <p className="text-xs text-muted-foreground">y {items.length - MAX_ITEMS} más.</p>}
      {data && (
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Valor en riesgo al costo: <strong className="text-foreground">{formatSoles(data.atRiskCents)}</strong>
        </p>
      )}
    </section>
  );
}
