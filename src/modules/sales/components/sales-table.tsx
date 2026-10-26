"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatDateTime, todayLima } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { Can } from "@/modules/auth/components/can";
import { useSales, useVoidSale } from "../hooks/use-sales";
import { PAYMENT_LABEL, SALES_LIST_LIMIT, type SaleSummary } from "../types";
import { SaleStatusBadge } from "./sale-status-badge";

export function SalesTable() {
  const [from, setFrom] = useState(todayLima());
  const [to, setTo] = useState(todayLima());
  const [toVoid, setToVoid] = useState<SaleSummary | null>(null);
  const range = from && to && from <= to ? { from, to } : null;

  const { data, isLoading, error } = useSales(range);
  const voidSale = useVoidSale();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Ventas</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="sales-from">Desde</Label>
          <Input id="sales-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="sales-to">Hasta</Label>
          <Input id="sales-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                <TableHead>Ticket</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cajero</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sin ventas en este rango
                  </TableCell>
                </TableRow>
              )}
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.ticketNumber}</TableCell>
                  <TableCell>{formatDateTime(s.createdAt)}</TableCell>
                  <TableCell>{s.userName}</TableCell>
                  <TableCell>{PAYMENT_LABEL[s.paymentMethod]}</TableCell>
                  <TableCell className="text-right font-semibold">{formatSoles(s.total)}</TableCell>
                  <TableCell>
                    <SaleStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "COMPLETED" && (
                      <Can permission="sales.void">
                        <Button variant="outline" size="sm" onClick={() => setToVoid(s)}>
                          Anular
                        </Button>
                      </Can>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length >= SALES_LIST_LIMIT && (
            <p className="text-sm text-muted-foreground">
              Se muestran las {SALES_LIST_LIMIT} ventas más recientes; acota el rango de fechas.
            </p>
          )}
        </>
      )}

      <Dialog open={!!toVoid} onOpenChange={(open) => !open && setToVoid(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular venta {toVoid?.ticketNumber}</DialogTitle>
            <DialogDescription>
              Se devolverá el stock a cada lote y la venta dejará de contar en el turno. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToVoid(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={voidSale.isPending}
              onClick={() => toVoid && voidSale.mutate(toVoid.id, { onSettled: () => setToVoid(null) })}
            >
              {voidSale.isPending ? "Anulando…" : "Anular venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
