"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parsePastedRows } from "@/lib/paste-rows";

type Props = {
  /** Recibe las filas leídas y los renglones que no se entendieron. */
  onAdd: (parsed: ReturnType<typeof parsePastedRows>) => void;
  onClose: () => void;
};

export function PasteRowsDialog({ onAdd, onClose }: Props) {
  const [text, setText] = useState("");
  const parsed = parsePastedRows(text);
  const ok = parsed.filter((p) => p.row).length;
  const bad = parsed.length - ok;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pegar filas</DialogTitle>
          <DialogDescription>
            Una fila por línea, con las columnas en este orden: código, cantidad, unidad, descripción,
            vencimiento, precio y total. Sirve el texto copiado de un PDF o de una hoja de cálculo.
          </DialogDescription>
        </DialogHeader>
        <textarea
          aria-label="Filas a pegar"
          className="h-56 w-full rounded-md border bg-background p-2 font-mono text-xs"
          placeholder={"CLO0047  3  CAJ  CLORURO DE SODIO 0.9% (1000ML) OQCORP X 12  31/12/2028  48.00  144.00"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {parsed.length > 0 && (
          <p className="text-sm" role="status">
            {ok} fila(s) entendida(s)
            {bad > 0 && <span className="text-destructive"> · {bad} renglón(es) no se entendieron y quedarán marcados</span>}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={parsed.length === 0}
            onClick={() => {
              onAdd(parsed);
              onClose();
            }}
          >
            Agregar {parsed.length} fila(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
