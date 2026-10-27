"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { centsText, EXPIRY_WINDOWS } from "@/lib/reports";
import { useAlertsReport } from "../hooks/use-reports";
import type { ExpiryRow } from "../types";
import { CsvButton } from "./csv-button";

const EXPIRY_HEADERS = ["Producto", "Lote", "Vencimiento", "Días", "Unidades", "Valor al costo"];
const expiryCsv = (rows: ExpiryRow[]) =>
  rows.map((r) => [r.name, r.lotNumber, r.expiryDate, r.daysLeft, r.stock, centsText(r.costValueCents)]);

function ExpiryTable({ rows, title, csvName, busy }: { rows: ExpiryRow[]; title: string; csvName: string; busy: boolean }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          {title} ({rows.length})
        </h2>
        <CsvButton name={csvName} headers={EXPIRY_HEADERS} rows={expiryCsv(rows)} disabled={busy} />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada que mostrar.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Días</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Valor al costo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.lotId}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.lotNumber}</TableCell>
                <TableCell>{formatDate(r.expiryDate)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.daysLeft}</TableCell>
                <TableCell className="text-right tabular-nums">{r.stock}</TableCell>
                <TableCell className="text-right tabular-nums">{formatSoles(r.costValueCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export function AlertsReport() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, isPlaceholderData, error } = useAlertsReport(days);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Vencen en los próximos</span>
        <div className="flex gap-1" role="group" aria-label="Días hasta el vencimiento">
          {EXPIRY_WINDOWS.map((d) => (
            <Button key={d} type="button" size="sm" variant={days === d ? "default" : "outline"} aria-pressed={days === d} onClick={() => setDays(d)}>
              {d} días
            </Button>
          ))}
        </div>
        {data && (
          <span className="ml-auto text-sm">
            Valor en riesgo al costo: <strong>{formatSoles(data.atRiskCents)}</strong>
          </span>
        )}
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && (
        <p role="alert" className="text-destructive">
          {apiErrorMessage(error)}
        </p>
      )}

      {data && (
        <div aria-busy={isPlaceholderData} className={`flex flex-col gap-6 ${isPlaceholderData ? "opacity-50" : ""}`}>
          <ExpiryTable rows={data.expired} title="Vencidos con stock" csvName="vencidos" busy={isPlaceholderData} />
          <ExpiryTable rows={data.expiringSoon} title={`Por vencer en ${data.days} días`} csvName="por-vencer" busy={isPlaceholderData} />
          <section className="flex flex-col gap-2 rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Stock bajo ({data.lowStock.length})</h2>
              <CsvButton
                name="stock-bajo"
                disabled={isPlaceholderData}
                headers={["Producto", "Stock", "Mínimo", "Falta"]}
                rows={data.lowStock.map((r) => [r.name, r.stock, r.minStock, r.missing])}
              />
            </div>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada que mostrar.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Falta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStock.map((r) => (
                    <TableRow key={r.productId}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.stock}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.minStock}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.missing}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
