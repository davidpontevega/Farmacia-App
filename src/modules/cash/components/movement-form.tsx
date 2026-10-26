"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toCents } from "@/lib/money";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { useState } from "react";
import { useAddMovement } from "../hooks/use-cash";
import { movementFormSchema, type MovementFormValues } from "../schemas";
import type { ManualMovementType } from "../types";

const TABS: {
  type: ManualMovementType;
  label: string;
  hint: string;
  permission: "cash.withdraw" | "cash.exchange";
}[] = [
  {
    type: "CASH_WITHDRAWAL",
    label: "Retiro efectivo",
    hint: "Sale dinero de la gaveta (ej. pago a proveedor).",
    permission: "cash.withdraw",
  },
  {
    type: "YAPE_TO_CASH_EXCHANGE",
    label: "Canje Yape→Efectivo",
    hint: "El cliente paga por Yape y recibe efectivo de la gaveta.",
    permission: "cash.exchange",
  },
];

function MovementFields({ type, hint }: { type: ManualMovementType; hint: string }) {
  const add = useAddMovement();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: { amount: "", reason: "" },
  });

  return (
    <form
      onSubmit={handleSubmit((v) =>
        add.mutate({ type, amount: toCents(v.amount), reason: v.reason }, { onSuccess: () => reset() }),
      )}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`amount-${type}`}>Monto (S/)</Label>
          <Input id={`amount-${type}`} inputMode="decimal" aria-invalid={!!errors.amount} {...register("amount")} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`reason-${type}`}>Motivo</Label>
          <Input id={`reason-${type}`} aria-invalid={!!errors.reason} {...register("reason")} />
          {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
        </div>
      </div>
      <Button type="submit" disabled={add.isPending} className="self-start">
        {add.isPending ? "Registrando…" : "Registrar"}
      </Button>
    </form>
  );
}

export function MovementForm() {
  const { can } = usePermissions();
  const tabs = TABS.filter((t) => can(t.permission));
  const [active, setActive] = useState<ManualMovementType | null>(null);
  const current = tabs.find((t) => t.type === active) ?? tabs[0];

  if (!current) return null;
  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-3 text-base font-medium">Movimientos de caja</h2>
      <div className="mb-3 flex gap-2">
        {tabs.map((t) => (
          <Button
            key={t.type}
            variant={t.type === current.type ? "default" : "outline"}
            aria-pressed={t.type === current.type}
            size="sm"
            onClick={() => setActive(t.type)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {/* key: al cambiar de pestaña el formulario arranca limpio */}
      <MovementFields key={current.type} type={current.type} hint={current.hint} />
    </div>
  );
}
