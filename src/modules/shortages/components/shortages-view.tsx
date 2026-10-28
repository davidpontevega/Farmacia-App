"use client";

import { Download, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/dates";
import { toClipboardText, toCsv } from "@/lib/shortages";
import { Can } from "@/modules/auth/components/can";
import { useCreateShortages, useResolveShortage, useShortages } from "../hooks/use-shortages";
import { STATUS_LABEL, type ShortageGroup, type ShortageStatus } from "../types";

const STATUSES: ShortageStatus[] = ["OPEN", "ORDERED", "DISMISSED"];

function downloadCsv(rows: ShortageGroup[], status: ShortageStatus) {
  // BOM para que Excel respete las tildes.
  const blob = new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `faltantes-${status.toLowerCase()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // algunos navegadores aún no empezaron la descarga

}

export function ShortagesView() {
  const [status, setStatus] = useState<ShortageStatus>("OPEN");
  const [toResolve, setToResolve] = useState<{ group: ShortageGroup; status: "ORDERED" | "DISMISSED" } | null>(null);
  const [adding, setAdding] = useState(false);
  const { data, isLoading, error } = useShortages(status);
  const resolve = useResolveShortage();

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(toClipboardText(data));
      toast.success("Lista copiada");
    } catch {
      toast.error("No se pudo copiar; usa «Descargar CSV»");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faltantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Medicamentos que los clientes pidieron y no se pudieron atender. Los más pedidos van primero.</p>
        </div>
        <Can permission="shortages.update">
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Anotar faltante
          </Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Estado" className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`min-h-9 rounded-full border px-4 text-sm transition-colors ${status === s ? "border-primary bg-primary font-semibold text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!data?.length} onClick={copy}>
            <Copy className="size-4" aria-hidden="true" />
            Copiar lista
          </Button>
          <Button variant="outline" size="sm" disabled={!data?.length} onClick={() => data && downloadCsv(data, status)}>
            <Download className="size-4" aria-hidden="true" />
            Descargar CSV
          </Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && (
        <p role="alert" className="text-destructive">
          {apiErrorMessage(error)}
        </p>
      )}
      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead className="text-right">Veces pedido</TableHead>
              <TableHead className="text-right">Cantidad total</TableHead>
              <TableHead>Último pedido</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {status === "OPEN" ? "No hay faltantes abiertos" : "Nada en esta lista"}
                </TableCell>
              </TableRow>
            )}
            {data.map((g) => (
              <TableRow key={g.nameKey}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="text-right tabular-nums">{g.timesRequested}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{g.totalQuantity}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(g.lastAt)} · {g.lastBy}
                </TableCell>
                <TableCell className="text-right">
                  {status === "OPEN" && (
                    <Can permission="shortages.update">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => setToResolve({ group: g, status: "ORDERED" })}>
                          Pedido
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setToResolve({ group: g, status: "DISMISSED" })}>
                          Descartar
                        </Button>
                      </div>
                    </Can>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!toResolve} onOpenChange={(open) => !open && setToResolve(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toResolve?.status === "ORDERED" ? "Marcar como pedido" : "Descartar faltante"}</DialogTitle>
            <DialogDescription>
              «{toResolve?.group.name}»: {toResolve?.group.timesRequested} pedidos, {toResolve?.group.totalQuantity} unidades.{" "}
              {toResolve?.status === "ORDERED" ? "Pasa a la pestaña Pedidos." : "Pasa a la pestaña Descartados."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToResolve(null)}>
              Cancelar
            </Button>
            <Button
              disabled={resolve.isPending}
              onClick={() => toResolve && resolve.mutate({ nameKey: toResolve.group.nameKey, status: toResolve.status }, { onSettled: () => setToResolve(null) })}
            >
              {resolve.isPending ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {adding && <AddShortageDialog onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddShortageDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const create = useCreateShortages();
  const qty = Number(quantity);
  const valid = name.trim().length > 0 && Number.isInteger(qty) && qty >= 1 && qty <= 9999;

  return (
    <Dialog open onOpenChange={(open) => !open && !create.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anotar faltante</DialogTitle>
          <DialogDescription>Un medicamento que se pidió y no se tiene. Solo el nombre y la cantidad; nada del paciente.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) create.mutate({ items: [{ name, quantity: qty, source: "MANUAL" }] }, { onSuccess: onClose });
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="sh-name">Medicamento</Label>
            <Input id="sh-name" autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Amoxicilina 500 mg" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sh-qty">Cantidad</Label>
            <Input id="sh-qty" type="number" inputMode="numeric" min={1} max={9999} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-28" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || create.isPending}>
              {create.isPending ? "Guardando…" : "Anotar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
