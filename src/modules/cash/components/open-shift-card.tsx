"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toCents } from "@/lib/money";
import { Can } from "@/modules/auth/components/can";
import { useOpenShift } from "../hooks/use-cash";
import { openShiftFormSchema, type OpenShiftFormValues } from "../schemas";

export function OpenShiftCard() {
  const open = useOpenShift();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpenShiftFormValues>({
    resolver: zodResolver(openShiftFormSchema),
    defaultValues: { openingAmount: "" },
  });

  return (
    <div className="max-w-sm rounded-lg border p-4">
      <h2 className="mb-3 text-base font-medium">Abrir turno</h2>
      <form
        onSubmit={handleSubmit((v) =>
          open.mutate({ openingAmount: toCents(v.openingAmount) }),
        )}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="opening">Monto inicial en caja (S/)</Label>
          <Input id="opening" inputMode="decimal" placeholder="0.00" aria-invalid={!!errors.openingAmount} {...register("openingAmount")} />
          {errors.openingAmount && (
            <p className="text-sm text-destructive">{errors.openingAmount.message}</p>
          )}
        </div>
        <Can permission="cash.open">
          <Button type="submit" disabled={open.isPending}>
            {open.isPending ? "Abriendo…" : "Abrir turno"}
          </Button>
        </Can>
      </form>
    </div>
  );
}
