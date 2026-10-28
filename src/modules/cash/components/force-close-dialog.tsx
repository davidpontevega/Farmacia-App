"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { closeDifferences } from "@/lib/cash";
import { formatSoles, isValidSoles, toCents } from "@/lib/money";
import { useForceCloseShift } from "../hooks/use-cash";
import type { LocalOpenShift } from "../types";
import { Difference } from "./close-shift-card";

const centsOrNull = (v: string) => (isValidSoles(v) ? toCents(v) : null);

/** Un supervisor cierra el turno de otra persona: con su propio conteo, o «sin cuadre» si nadie puede contar el dinero. */
export function ForceCloseDialog({ shift, onClose }: { shift: LocalOpenShift & { summary: NonNullable<LocalOpenShift["summary"]>; openingAmount: number }; onClose: () => void }) {
  const [mode, setMode] = useState<"COUNTED" | "NO_COUNT">("COUNTED");
  const [cash, setCash] = useState("");
  const [yape, setYape] = useState("0");
  const [understood, setUnderstood] = useState(false);
  const close = useForceCloseShift();

  const countedCash = centsOrNull(cash);
  const countedYape = centsOrNull(yape);
  const live = closeDifferences({ opening: shift.openingAmount, ...shift.summary }, { cash: countedCash ?? 0, yape: countedYape ?? 0 });
  const ready = mode === "COUNTED" ? countedCash !== null && countedYape !== null : understood;

  const confirm = () =>
    close.mutate(
      {
        id: shift.id,
        input: mode === "COUNTED" ? { mode, countedCash: countedCash!, countedYape: countedYape! } : { mode },
      },
      { onSuccess: onClose },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && !close.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar el turno de {shift.ownerName}</DialogTitle>
          <DialogDescription>
            Esperado: efectivo {formatSoles(live.expectedCash)} · Yape {formatSoles(live.expectedYape)}. Después de cerrar no se podrán registrar más ventas en este turno.
          </DialogDescription>
        </DialogHeader>

        <div role="group" aria-label="Cómo cerrar" className="grid grid-cols-2 gap-2">
          {(["COUNTED", "NO_COUNT"] as const).map((m) => (
            <Button key={m} type="button" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "COUNTED" ? "Con conteo" : "Sin cuadre"}
            </Button>
          ))}
        </div>

        {mode === "COUNTED" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="fc-cash">Efectivo contado (S/)</Label>
              <Input id="fc-cash" inputMode="decimal" autoFocus value={cash} onChange={(e) => setCash(e.target.value)} />
              <Difference label="Efectivo" cents={countedCash === null ? null : live.differenceCash} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="fc-yape">Yape / Plin recibido (S/)</Label>
              <Input id="fc-yape" inputMode="decimal" value={yape} onChange={(e) => setYape(e.target.value)} />
              <Difference label="Yape" cents={countedYape === null ? null : live.differenceYape} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">
            <p>El dinero no se cuenta: el turno queda cerrado «sin cuadre», sin diferencia. Úsalo solo si nadie puede contar la caja. Queda registrado quién lo cerró.</p>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
              Entiendo que no se cuenta el dinero
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={close.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!ready || close.isPending} onClick={confirm}>
            {close.isPending ? "Cerrando…" : "Confirmar cierre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
