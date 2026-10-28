"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate, todayLima } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { usePurchases } from "../hooks/use-purchases";
import { PURCHASES_LIST_LIMIT, type PurchaseSummary } from "../types";
import { PurchaseDetailDialog } from "./purchase-detail-dialog";

export function PurchasesTable() {
  const [from, setFrom] = useState(todayLima());
  const [to, setTo] = useState(todayLima());
  const [selected, setSelected] = useState<PurchaseSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const range = from && to && from <= to ? { from, to } : null;
  const { data, isLoading, error } = usePurchases(range);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="pur-from">Desde</Label>
          <Input id="pur-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pur-to">Hasta</Label>
          <Input id="pur-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {!range && (
          <p className="text-sm text-destructive">«Desde» no puede ser posterior a «Hasta»</p>
        )}
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-destructive">{apiErrorMessage(error)}</p>}
      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha del documento</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Registrada por</TableHead>
                <TableHead className="text-right">Ítems</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead><span className="sr-only">Detalle</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sin compras en este rango
                  </TableCell>
                </TableRow>
              )}
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.documentDate)}</TableCell>
                  <TableCell>{p.supplier ?? "—"}</TableCell>
                  <TableCell>{p.documentNumber ?? "—"}</TableCell>
                  <TableCell>{p.userName}</TableCell>
                  <TableCell className="text-right">{p.itemCount}</TableCell>
                  <TableCell className="text-right font-semibold">{formatSoles(p.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-primary text-primary hover:bg-secondary hover:text-primary"
                      aria-label={`Ver detalle de la compra ${p.documentNumber ?? formatDate(p.documentDate)}`}
                      onClick={() => {
                        setSelected(p);
                        setDetailOpen(true);
                      }}
                    >
                      Ver detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length >= PURCHASES_LIST_LIMIT && (
            <p className="text-sm text-muted-foreground">
              Se muestran las {PURCHASES_LIST_LIMIT} compras más recientes; acota el rango de fechas.
            </p>
          )}
        </>
      )}
      <PurchaseDetailDialog purchase={selected} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
