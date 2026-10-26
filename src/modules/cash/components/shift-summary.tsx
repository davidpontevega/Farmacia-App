import { formatDateTime } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import type { ShiftSummary } from "../types";

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "plus" | "minus";
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "minus" ? "font-medium text-destructive" : "font-medium"}>
        {value}
      </span>
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
    <div className="rounded-lg border p-4">
      <h2 className="mb-1 text-base font-medium">Turno activo</h2>
      <p className="mb-3 text-xs text-muted-foreground">Abierto {formatDateTime(openedAt)}</p>
      <div className="flex flex-col gap-1.5">
        <Row label="Apertura" value={formatSoles(openingAmount)} />
        <Row label={`Ventas en efectivo (${s.salesCount} ventas en total)`} value={`+ ${formatSoles(s.cashSales)}`} />
        <Row label="Ventas Yape / Plin" value={`+ ${formatSoles(s.yapeSales)}`} />
        {s.withdrawals > 0 && (
          <Row label="Retiros de efectivo" value={`- ${formatSoles(s.withdrawals)}`} tone="minus" />
        )}
        {s.exchanges > 0 && (
          <Row label="Canjes Yape→Efectivo" value={`- ${formatSoles(s.exchanges)}`} tone="minus" />
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1.5 border-t pt-3">
        <div className="flex justify-between font-semibold">
          <span>Efectivo esperado en gaveta</span>
          <span>{formatSoles(s.expectedCash)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Yape / Plin esperado</span>
          <span>{formatSoles(s.expectedYape)}</span>
        </div>
      </div>
    </div>
  );
}
