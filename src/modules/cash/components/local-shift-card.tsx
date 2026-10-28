"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { Can } from "@/modules/auth/components/can";
import type { LocalOpenShift } from "../types";
import { ForceCloseDialog } from "./force-close-dialog";

/** La caja la tiene otra persona: no se puede abrir otro turno hasta que ella cierre (o un supervisor lo cierre). */
export function LocalShiftCard({ shift }: { shift: LocalOpenShift }) {
  const [closing, setClosing] = useState(false);

  return (
    <div className="max-w-md rounded-2xl border border-warning-ring/40 bg-warning-soft p-5 text-warning">
      <h2 className="text-base font-semibold">La caja está abierta por {shift.ownerName}</h2>
      <p id="local-shift-help" className="mt-1 text-sm">
        Desde {formatDateTime(shift.openedAt)}
        {shift.stale && " (turno de un día anterior)"}. Solo hay una caja: {shift.ownerName} debe cerrar su turno antes de que otra persona abra el suyo.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled aria-describedby="local-shift-help">
          Abrir turno
        </Button>
        <Can permission="cash.supervise">
          {shift.summary && shift.openingAmount !== undefined && (
            <Button variant="destructive" onClick={() => setClosing(true)}>
              Cerrar turno de {shift.ownerName}
            </Button>
          )}
        </Can>
      </div>
      {closing && shift.summary && shift.openingAmount !== undefined && (
        <ForceCloseDialog shift={{ ...shift, summary: shift.summary, openingAmount: shift.openingAmount }} onClose={() => setClosing(false)} />
      )}
    </div>
  );
}
