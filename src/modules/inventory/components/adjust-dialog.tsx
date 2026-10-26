"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useAdjustStock } from "../hooks/use-inventory";
import { adjustFormSchema, type AdjustFormValues } from "../schemas";
import type { LotRow } from "../types";

export function AdjustDialog({ lot, onClose }: { lot: LotRow; onClose: () => void }) {
  const adjust = useAdjustStock();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustFormSchema),
    defaultValues: { quantity: "", reason: "" },
  });

  const onSubmit = (v: AdjustFormValues) =>
    adjust.mutate(
      { lotId: lot.lotId, quantity: Number(v.quantity), reason: v.reason },
      { onSuccess: onClose },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar lote {lot.lotNumber}</DialogTitle>
          <DialogDescription>
            Stock actual: {lot.stock}. Usa un número negativo para descontar (ej. -5).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="adj-qty">Cantidad (con signo)</Label>
            <Input id="adj-qty" inputMode="numeric" {...register("quantity")} />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="adj-reason">Motivo</Label>
            <Input id="adj-reason" {...register("reason")} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={adjust.isPending}>
              {adjust.isPending ? "Guardando…" : "Aplicar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
