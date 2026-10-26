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
import { addDays, todayLima } from "@/lib/dates";
import { toCents } from "@/lib/money";
import { useCreateLot } from "../hooks/use-inventory";
import { lotFormSchema, type LotFormValues } from "../schemas";

export function NewLotDialog({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const create = useCreateLot(productId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: { lotNumber: "", expiryDate: "", purchasePrice: "", quantity: "" },
  });

  const onSubmit = (v: LotFormValues) =>
    create.mutate(
      {
        lotNumber: v.lotNumber,
        expiryDate: v.expiryDate,
        purchasePrice: toCents(v.purchasePrice),
        quantity: Number(v.quantity),
      },
      { onSuccess: onClose },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo lote</DialogTitle>
          <DialogDescription>{productName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="lot-number">Número de lote</Label>
            <Input id="lot-number" {...register("lotNumber")} />
            {errors.lotNumber && (
              <p className="text-sm text-destructive">{errors.lotNumber.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="lot-expiry">Vencimiento</Label>
            <Input
              id="lot-expiry"
              type="date"
              min={addDays(todayLima(), 1)}
              {...register("expiryDate")}
            />
            {errors.expiryDate && (
              <p className="text-sm text-destructive">{errors.expiryDate.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="lot-cost">Costo unitario (S/)</Label>
              <Input id="lot-cost" inputMode="decimal" {...register("purchasePrice")} />
              {errors.purchasePrice && (
                <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="lot-qty">Cantidad</Label>
              <Input id="lot-qty" inputMode="numeric" {...register("quantity")} />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Guardando…" : "Registrar lote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
