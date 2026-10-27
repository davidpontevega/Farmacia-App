"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUploadProof } from "../hooks/use-sales";
import { proofUrl } from "../services/sales.service";
import type { SaleSummary } from "../types";
import { PhotoButton } from "./photo-button";

/** Estado de la constancia de una venta con Yape/Plin: verla, o avisar que falta (y subirla si corresponde). */
export function ProofCell({ sale, canUpload, proofEnabled }: { sale: SaleSummary; canUpload: boolean; proofEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const upload = useUploadProof();

  if (sale.yapeAmount <= 0 || sale.status !== "COMPLETED") return null;

  if (sale.hasProof) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Ver constancia
        </Button>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); setBroken(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Constancia · {sale.ticketNumber}</DialogTitle>
              <DialogDescription>Foto de la transferencia. Se borra a los 90 días.</DialogDescription>
            </DialogHeader>
            {broken ? (
              <p role="alert" className="text-sm text-destructive">La constancia no está disponible.</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API, no optimizable
              <img src={proofUrl(sale.id)} alt={`Constancia de la venta ${sale.ticketNumber}`} onError={() => setBroken(true)} className="max-h-[70vh] w-full rounded-lg border object-contain" />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (!proofEnabled) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-warning">Sin constancia</span>
      {canUpload && (
        <PhotoButton
          label="Subir foto"
          disabled={upload.isPending}
          onPick={(photo) => upload.mutate({ saleId: sale.id, photo })}
        />
      )}
    </span>
  );
}
