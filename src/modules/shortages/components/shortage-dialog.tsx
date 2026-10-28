"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SHORTAGE_NAME_MAX } from "@/lib/shortages";
import { useCreateShortages } from "../hooks/use-shortages";

/** Anota un faltante a mano (administración) o desde la búsqueda de caja. Solo nombre y cantidad; nada del paciente. */
export function ShortageDialog({ source, initialName = "", onClose }: { source: "MANUAL" | "SEARCH"; initialName?: string; onClose: () => void }) {
  const [name, setName] = useState(initialName);
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
            if (valid) create.mutate({ items: [{ name, quantity: qty, source }] }, { onSuccess: onClose });
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="sh-name">Medicamento</Label>
            <Input id="sh-name" autoFocus maxLength={SHORTAGE_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} placeholder="Amoxicilina 500 mg" />
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
