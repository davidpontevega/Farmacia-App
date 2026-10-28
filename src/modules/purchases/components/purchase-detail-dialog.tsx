"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { detailTotals } from "@/lib/purchases";
import { usePurchase } from "../hooks/use-purchases";
import type { PurchaseSummary } from "../types";

/**
 * Qué se compró en cada lote (spec 024). `purchase` es la fila del historial (da el título mientras carga) y se conserva
 * al cerrar, para que el contenido no parpadee durante la animación de salida; `open` manda sobre la visibilidad.
 */
export function PurchaseDetailDialog({ purchase, open, onClose }: { purchase: PurchaseSummary | null; open: boolean; onClose: () => void }) {
  const { data, isLoading, error } = usePurchase(purchase?.id ?? null);
  const totals = data && detailTotals(data.items, data.otherCharges, data.total);
  const label = purchase ? (purchase.documentNumber ?? formatDate(purchase.documentDate)) : "";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Compra {label}</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.supplier ?? "Sin proveedor"} · documento del ${formatDate(data.documentDate)} · registrada por ${data.userName} el ${formatDateTime(data.createdAt)}`
              : "Productos y lotes que entraron con esta compra."}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-40 w-full" aria-busy="true" />}
        {error && (
          <p role="alert" className="text-destructive">
            {apiErrorMessage(error)}
          </p>
        )}
        {data && totals && (
          <div className="flex flex-col gap-4">
            {data.items.length === 0 ? (
              <p className="text-warning">Esta compra no tiene ítems registrados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">P. venta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <span className="font-medium">{i.productName}</span>
                        {i.genericName && <span className="block text-xs text-muted-foreground">{i.genericName}</span>}
                      </TableCell>
                      <TableCell>{i.lotNumber}</TableCell>
                      <TableCell>{formatDate(i.expiryDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatSoles(i.purchasePrice)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatSoles(i.purchasePrice * i.quantity)}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.salePrice === null ? "—" : formatSoles(i.salePrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm tabular-nums">
              <dt className="text-muted-foreground">Subtotal de ítems</dt>
              <dd className="text-right">{formatSoles(totals.subtotal)}</dd>
              {data.otherCharges > 0 && (
                <>
                  <dt className="text-muted-foreground">Otros gastos</dt>
                  <dd className="text-right">{formatSoles(data.otherCharges)}</dd>
                </>
              )}
              <dt className="font-semibold">Total</dt>
              <dd className="text-right font-bold">{formatSoles(data.total)}</dd>
            </dl>
            {totals.difference !== 0 && (
              <p className="text-xs text-warning">
                El total guardado es {formatSoles(Math.abs(totals.difference))} {totals.difference > 0 ? "mayor" : "menor"} que la suma de ítems y gastos.
              </p>
            )}

            {data.shortages.length > 0 && (
              <section aria-labelledby="pd-short" className="rounded-xl border bg-muted/40 p-3">
                <h3 id="pd-short" className="mb-1 text-sm font-semibold">
                  Faltantes que cubrió
                </h3>
                <ul className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                  {data.shortages.map((s, idx) => (
                    <li key={`${s.name}-${idx}`}>
                      {s.name} <span className="text-muted-foreground">× {s.quantity}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
