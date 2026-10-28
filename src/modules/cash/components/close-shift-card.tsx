"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { closeDifferences } from "@/lib/cash";
import { formatSoles, formatSolesSigned, isValidSoles, toCents } from "@/lib/money";
import { Can } from "@/modules/auth/components/can";
import { useCloseShift } from "../hooks/use-cash";
import { closeShiftFormSchema, type CloseShiftFormValues } from "../schemas";
import type { ShiftSummary } from "../types";

const centsOrNull = (v: string) => (isValidSoles(v) ? toCents(v) : null);

export function Difference({ label, cents }: { label: string; cents: number | null }) {
  if (cents === null) return null;
  const tone = cents === 0 ? "text-success" : "text-destructive";
  return (
    <p className={`text-sm font-medium ${tone}`}>
      {label}:{" "}
      {cents === 0
        ? "cuadra exacto"
        : `${formatSolesSigned(cents)} (${cents > 0 ? "sobra" : "falta"})`}
    </p>
  );
}

export function CloseShiftCard({
  openingAmount,
  summary,
}: {
  openingAmount: number;
  summary: ShiftSummary;
}) {
  const close = useCloseShift();
  const [confirming, setConfirming] = useState<CloseShiftFormValues | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftFormSchema),
    defaultValues: { countedCash: "", countedYape: "0" },
  });

  const [countedCash, countedYape] = useWatch({
    control,
    name: ["countedCash", "countedYape"],
  });
  const [cash, yape] = [centsOrNull(countedCash), centsOrNull(countedYape)];
  const live = closeDifferences(
    { opening: openingAmount, ...summary },
    { cash: cash ?? 0, yape: yape ?? 0 },
  );

  const submit = () =>
    confirming &&
    close.mutate(
      { countedCash: toCents(confirming.countedCash), countedYape: toCents(confirming.countedYape) },
      { onSettled: () => setConfirming(null) },
    );

  return (
    <div className="rounded-2xl border border-destructive/30 bg-card p-5">
      <h2 className="mb-3 text-base font-semibold">Cerrar turno</h2>
      <form onSubmit={handleSubmit(setConfirming)} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="counted-cash">Efectivo contado en gaveta (S/)</Label>
            <Input id="counted-cash" inputMode="decimal" aria-invalid={!!errors.countedCash} {...register("countedCash")} />
            {errors.countedCash && (
              <p className="text-sm text-destructive">{errors.countedCash.message}</p>
            )}
            <Difference label="Efectivo" cents={cash === null ? null : live.differenceCash} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="counted-yape">Yape / Plin recibido (S/)</Label>
            <Input id="counted-yape" inputMode="decimal" aria-invalid={!!errors.countedYape} {...register("countedYape")} />
            {errors.countedYape && (
              <p className="text-sm text-destructive">{errors.countedYape.message}</p>
            )}
            <Difference label="Yape" cents={yape === null ? null : live.differenceYape} />
          </div>
        </div>
        <Can permission="cash.close">
          <Button type="submit" variant="destructive" className="self-start">
            Cerrar turno
          </Button>
        </Can>
      </form>

      <Dialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar el turno?</DialogTitle>
            <DialogDescription>
              Esperado: efectivo {formatSoles(live.expectedCash)} · Yape {formatSoles(live.expectedYape)}.
              Después de cerrar no se podrán registrar más ventas ni movimientos en este turno.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={close.isPending} onClick={submit}>
              {close.isPending ? "Cerrando…" : "Confirmar cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
