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
import { centsText, quickRange, rangeError } from "@/lib/reports";
import { useSalesReport } from "../hooks/use-reports";
import type { SalesSort } from "../types";
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SalesReport() {
  const today = todayLima();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [sort, setSort] = useState<SalesSort>("units");

  const problem = rangeError(from, to, today);
  const { data: loaded, isLoading, isPlaceholderData, error } = useSalesReport(problem ? null : { from, to }, sort);
  // Con un rango inválido no se muestran datos de la consulta anterior.
  const data = problem ? undefined : loaded;
  const empty = data && data.salesCount === 0 && data.refundCents === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="rep-from">Desde</Label>
          <Input id="rep-from" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="rep-to">Hasta</Label>
          <Input id="rep-to" type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {QUICK.map(([kind, label]) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant="outline"
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
        <div aria-busy={isPlaceholderData} className={`flex flex-col gap-4 ${isPlaceholderData ? "opacity-50" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Ventas netas" value={formatSoles(data.netCents)} hint={data.refundCents > 0 ? `${formatSoles(data.grossCents)} − ${formatSoles(data.refundCents)} devueltos` : undefined} />
            <Stat label="N.º de ventas" value={String(data.salesCount)} />
            <Stat label="Ticket promedio" value={formatSoles(data.averageTicketCents)} />
            <Stat label="Utilidad bruta" value={formatSoles(data.profitCents)} hint={`Costo ${formatSoles(data.costCents)}`} />
            <Stat label="Margen" value={data.marginPct === null ? "—" : `${data.marginPct}%`} />
          </div>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Ventas por día</h2>
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

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h2 className="font-medium">Por método de pago</h2>
              <MethodChart cashCents={data.byMethod.cashCents} yapeCents={data.byMethod.yapeCents} />
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Efectivo</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSoles(data.byMethod.cashCents)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Yape</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSoles(data.byMethod.yapeCents)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="font-medium">Por cajero</h2>
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

          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-medium">Más vendidos</h2>
                <p className="text-xs text-muted-foreground">Antes de descuentos y devoluciones.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1" role="group" aria-label="Ordenar por">
                  {SORTS.map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={sort === value ? "default" : "outline"}
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
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.units}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSoles(p.amountCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSoles(p.profitCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>
      )}
    </div>
  );
}
