"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import type { ReturnCondition } from "@/lib/returns";
import { useCreateReturn } from "../hooks/use-returns";
import { CONDITION_LABEL, type LookupResponse } from "../types";

type Selection = { quantity: number; condition: ReturnCondition };

/** Se monta con `key={sale.id}`: cada venta buscada arranca con el formulario limpio. */
export function ReturnForm({ data, onDone }: { data: LookupResponse; onDone: () => void }) {
  const { sale, lines } = data;
  const create = useCreateReturn();
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [reason, setReason] = useState("");

  // Si el disponible bajó (409 y refresco), la cantidad elegida se recorta al nuevo tope.
  const chosen = lines
    .map((l) => {
      const sel = selection[l.saleItemId];
      return { line: l, sel: sel && { ...sel, quantity: Math.min(sel.quantity, l.available) } };
    })
    .filter((x) => x.sel && x.sel.quantity > 0);
  const refund = chosen.reduce((sum, x) => sum + x.sel.quantity * x.line.unitPrice, 0);
  const canSubmit = chosen.length > 0 && reason.trim().length >= 3 && !create.isPending;

  const update = (id: string, patch: Partial<Selection>) =>
    setSelection((prev) => {
      const current: Selection = prev[id] ?? { quantity: 0, condition: "GOOD" };
      return { ...prev, [id]: { ...current, ...patch } };
    });

  const submit = () =>
    create.mutate(
      {
        saleId: sale.id,
        reason: reason.trim(),
        items: chosen.map((x) => ({
          saleItemId: x.line.saleItemId,
          quantity: x.sel.quantity,
          condition: x.sel.condition,
        })),
      },
      { onSuccess: onDone },
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border bg-card p-5 text-sm">
        <p className="font-medium">
          {sale.ticketNumber} · {formatDateTime(sale.createdAt)} · Total {formatSoles(sale.total)}
        </p>
        {sale.status === "VOIDED" && (
          <p className="mt-1 text-destructive">Esta venta está anulada: no admite devoluciones.</p>
        )}
        {sale.status !== "VOIDED" && lines.length === 0 && (
          <p className="mt-1 text-muted-foreground">
            Ya se devolvió todo lo de esta venta.
          </p>
        )}
      </div>

      {lines.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Ya devuelto</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="w-28">Devolver</TableHead>
                <TableHead className="w-32">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const sel = selection[l.saleItemId];
                return (
                  <TableRow key={l.saleItemId}>
                    <TableCell className="font-medium">
                      {l.productName}
                      <span className="block text-xs text-muted-foreground">
                        {formatSoles(l.unitPrice)} c/u
                      </span>
                    </TableCell>
                    <TableCell>{l.lotNumber}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right">{l.returned}</TableCell>
                    <TableCell className="text-right font-medium">{l.available}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={l.available}
                        aria-label={`Cantidad a devolver de ${l.productName}, lote ${l.lotNumber}`}
                        placeholder="0"
                        value={sel && sel.quantity > 0 ? sel.quantity : ""}
                        onChange={(e) =>
                          update(l.saleItemId, {
                            quantity: Math.min(l.available, Math.max(0, Math.trunc(Number(e.target.value) || 0))),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        aria-label={`Estado de ${l.productName}, lote ${l.lotNumber}`}
                        className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                        value={sel?.condition ?? "GOOD"}
                        onChange={(e) =>
                          update(l.saleItemId, { condition: e.target.value as ReturnCondition })
                        }
                      >
                        {(Object.keys(CONDITION_LABEL) as ReturnCondition[]).map((c) => (
                          <option key={c} value={c}>
                            {CONDITION_LABEL[c]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-1">
            <Label htmlFor="return-reason">Motivo de la devolución</Label>
            <Input
              id="return-reason"
              placeholder="Ej: producto dañado, cliente insatisfecho…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total a devolver (en efectivo)</p>
              <p className="text-2xl font-bold">{formatSoles(refund)}</p>
            </div>
            <Button size="lg" disabled={!canSubmit} onClick={submit}>
              {create.isPending ? "Registrando…" : "Registrar devolución"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Lo «Bueno» vuelve al stock; lo «Dañado» se reembolsa pero no vuelve al stock. El reembolso
            sale del efectivo de tu turno abierto.
          </p>
        </>
      )}
    </div>
  );
}
