"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate, todayLima } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { centsText, deltaPct, previousRange, quickRange, rangeError } from "@/lib/reports";
import { CHART_COLORS } from "./chart-colors";
import { useSalesReport } from "../hooks/use-reports";
import type { SalesSort } from "../types";
import { AlertsPanel } from "./alerts-panel";
import { CsvButton } from "./csv-button";
import { DailyChart } from "./daily-chart";
import { MethodChart } from "./method-chart";
import { TopChart } from "./top-chart";

const QUICK = [
  ["today", "Hoy"],
  ["yesterday", "Ayer"],
  ["last7", "Últimos 7 días"],
  ["month", "Este mes"],
] as const;

const SORTS: [SalesSort, string][] = [
  ["units", "Unidades"],
  ["amount", "Importe"],
  ["profit", "Utilidad"],
];

const CARD = "card-surface p-5";

/** Variación contra el período anterior; sin base de comparación no se muestra. */
function Delta({ pct, unit = "%" }: { pct: number | null; unit?: string }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${up ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"}`}>
      {up ? "+" : "−"}
      {Math.abs(pct)}
      {unit}
    </span>
  );
}

function Stat({ label, value, delta, note }: { label: string; value: string; delta?: React.ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1.5 card-surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {delta}
        {note && <span>{note}</span>}
      </p>
    </div>
  );
}

export function SalesReport({ onSeeAlerts }: { onSeeAlerts: () => void }) {
  const today = todayLima();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [sort, setSort] = useState<SalesSort>("units");

  const problem = rangeError(from, to, today);
  const { data: loaded, isLoading, isPlaceholderData, error } = useSalesReport(problem ? null : { from, to }, sort);
  // Con un rango inválido no se muestran datos de la consulta anterior.
  const data = problem ? undefined : loaded;
  const empty = data && data.salesCount === 0 && data.refundCents === 0;

  // El período anterior solo sirve para las flechas de variación: si falla, simplemente no se muestran.
  const { data: prev, isPlaceholderData: prevStale } = useSalesReport(problem ? null : previousRange(from, to), "units");
  const base = data && prev && !isPlaceholderData && !prevStale && prev.salesCount > 0 ? prev : null;
  const marginDelta =
    base && data && data.marginPct !== null && base.marginPct !== null ? Math.round((data.marginPct - base.marginPct) * 10) / 10 : null;

  const total = data ? data.byMethod.cashCents + data.byMethod.yapeCents : 0;
  const share = (cents: number) => (total > 0 ? Math.round((cents / total) * 100) : 0);
  const activeQuick = QUICK.find(([kind]) => {
    const r = quickRange(kind, today);
    return r.from === from && r.to === to;
  })?.[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Período" className="flex flex-wrap gap-0.5 rounded-xl border bg-card p-1">
          {QUICK.map(([kind, label]) => (
            <Button
              key={kind}
              type="button"
              variant={activeQuick === kind ? "default" : "ghost"}
              aria-pressed={activeQuick === kind}
              className="h-9 rounded-lg px-4"
              onClick={() => {
                const r = quickRange(kind, today);
                setFrom(r.from);
                setTo(r.to);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="rep-from" className="text-xs text-muted-foreground">
            Desde
          </Label>
          <Input id="rep-from" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 bg-card" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="rep-to" className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <Input id="rep-to" type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} className="h-10 bg-card" />
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && (
        <p role="alert" className="text-destructive">
          {apiErrorMessage(error)}
        </p>
      )}
      {empty && <p className="text-muted-foreground">No hay datos en este período.</p>}
      {data && data.voided.count > 0 && (
        <p className="text-sm text-muted-foreground">
          {data.voided.count} anulada(s) por {formatSoles(data.voided.cents)}, no incluidas.
        </p>
      )}

      {data && !empty && (
        <div aria-busy={isPlaceholderData} className={`flex flex-col gap-5 ${isPlaceholderData ? "opacity-50" : ""}`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Stat
              label="Ventas netas"
              value={formatSoles(data.netCents)}
              delta={base && <Delta pct={deltaPct(data.netCents, base.netCents)} />}
              note={data.refundCents > 0 ? `${formatSoles(data.grossCents)} − ${formatSoles(data.refundCents)} devueltos` : base ? "vs. período anterior" : undefined}
            />
            <Stat label="N.º de ventas" value={String(data.salesCount)} delta={base && <Delta pct={deltaPct(data.salesCount, base.salesCount)} />} note={base ? "vs. período anterior" : undefined} />
            <Stat
              label="Ticket promedio"
              value={formatSoles(data.averageTicketCents)}
              delta={base && <Delta pct={deltaPct(data.averageTicketCents, base.averageTicketCents)} />}
              note={base ? "vs. período anterior" : undefined}
            />
            <Stat
              label="Utilidad bruta"
              value={formatSoles(data.profitCents)}
              delta={base && <Delta pct={deltaPct(data.profitCents, base.profitCents)} />}
              note={`Costo ${formatSoles(data.costCents)}`}
            />
            <Stat
              label="Margen"
              value={data.marginPct === null ? "—" : `${data.marginPct}%`}
              delta={marginDelta !== null && <Delta pct={marginDelta} unit=" pts" />}
              note={marginDelta !== null ? "vs. período anterior" : undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className={`${CARD} flex min-w-0 flex-col gap-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Ventas por día</h2>
                <CsvButton
                  name="ventas-por-dia"
                  disabled={isPlaceholderData}
                  headers={["Fecha", "Ventas", "Vendido", "Devuelto", "Neto"]}
                  rows={data.byDay.map((d) => [d.date, d.salesCount, centsText(d.grossCents), centsText(d.refundCents), centsText(d.netCents)])}
                />
              </div>
              <DailyChart days={data.byDay} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Vendido</TableHead>
                    <TableHead className="text-right">Devuelto</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byDay.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{formatDate(d.date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.salesCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSoles(d.grossCents)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSoles(d.refundCents)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatSoles(d.netCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            <section className={`${CARD} flex min-w-0 flex-col gap-4`}>
              <h2 className="text-base font-semibold">Por método de pago</h2>
              <MethodChart cashCents={data.byMethod.cashCents} yapeCents={data.byMethod.yapeCents} />
              <ul className="flex flex-col gap-2.5 text-sm">
                {[
                  ["Efectivo", data.byMethod.cashCents, CHART_COLORS.cash],
                  ["Yape", data.byMethod.yapeCents, CHART_COLORS.yape],
                ].map(([name, cents, color]) => (
                  <li key={String(name)} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-3 rounded" style={{ background: String(color) }} aria-hidden="true" />
                      {name}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatSoles(Number(cents))} <span className="font-normal text-muted-foreground">· {share(Number(cents))}%</span>
                    </span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-2 border-t pt-4 text-sm font-semibold">Por cajero</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cajero</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byCashier.map((c) => (
                    <TableRow key={c.userId}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.salesCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSoles(c.totalCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className={`${CARD} flex min-w-0 flex-col gap-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Más vendidos</h2>
                  <p className="text-xs text-muted-foreground">Antes de descuentos y devoluciones.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1" role="group" aria-label="Ordenar por">
                    {SORTS.map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={sort === value ? "secondary" : "ghost"}
                        className={sort === value ? "font-semibold" : "text-muted-foreground"}
                        aria-pressed={sort === value}
                        onClick={() => setSort(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <CsvButton
                    name="mas-vendidos"
                    disabled={isPlaceholderData}
                    headers={["Producto", "Unidades", "Importe", "Utilidad"]}
                    rows={data.topProducts.map((p) => [p.name, p.units, centsText(p.amountCents), centsText(p.profitCents)])}
                  />
                </div>
              </div>
              <TopChart rows={data.topProducts} sort={sort} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Utilidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.units}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSoles(p.amountCents)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-success">{formatSoles(p.profitCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
            <AlertsPanel onSeeAll={onSeeAlerts} />
          </div>
        </div>
      )}
    </div>
  );
}
