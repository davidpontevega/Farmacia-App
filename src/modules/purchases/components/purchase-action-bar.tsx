"use client";

import { Button } from "@/components/ui/button";
import { formatSoles } from "@/lib/money";

/** Barra fija al pie, solo en celular: el total y las acciones principales sin subir a buscarlas. */
export function PurchaseActionBar({ totalCents, canSubmit, pending, onCancel, onSubmit }: { totalCents: number; canSubmit: boolean; pending: boolean; onCancel: () => void; onSubmit: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgb(0_0_0/0.08)] lg:hidden">
      <span role="status" className="sr-only">
        Total de la compra {formatSoles(totalCents)}
      </span>
      <span className="flex min-w-0 flex-col leading-tight" aria-hidden="true">
        <span className="text-xs font-semibold text-muted-foreground">Total</span>
        <span className="text-lg font-extrabold tabular-nums">{formatSoles(totalCents)}</span>
      </span>
      <Button type="button" variant="outline" className="ml-auto h-11 px-4 font-semibold" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="button" className="h-11 px-4 font-semibold" disabled={!canSubmit} onClick={onSubmit}>
        {pending ? "Registrando…" : "Registrar compra"}
      </Button>
    </div>
  );
}
