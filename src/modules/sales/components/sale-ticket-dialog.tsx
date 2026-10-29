"use client";

import { MessageCircle, Printer } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { TICKET_DISCLAIMER, TICKET_THANKS, TICKET_TITLE, itemSubtotal, normalizePhone, paymentLines, ticketText, whatsappUrl, type TicketData } from "@/lib/ticket";

function TicketBody({ t }: { t: TicketData }) {
  return (
    <div className="font-mono text-[11px] leading-snug text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{t.business.name}</p>
        <p>RUC {t.business.ruc}</p>
        <p>{t.business.address}</p>
      </div>
      <div className="my-2 border-y border-dashed border-black py-1 text-center">
        <p className="font-bold">{TICKET_TITLE}</p>
        <p>{TICKET_DISCLAIMER}</p>
      </div>
      <p>N° {t.ticketNumber}</p>
      <p>{formatDateTime(t.createdAt)}</p>
      <p>Cajero: {t.userName || "—"}</p>
      <div className="my-2 border-t border-dashed border-black pt-1">
        {t.items.map((i, n) => (
          <div key={n} className="mb-1">
            <p>
              {i.quantity} x {i.name}
            </p>
            <p className="flex justify-between tabular-nums">
              <span>&nbsp;&nbsp;{formatSoles(i.unitPrice)} c/u</span>
              <span>{formatSoles(itemSubtotal(i))}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="flex justify-between border-t border-dashed border-black pt-1 text-sm font-bold tabular-nums">
        <span>TOTAL</span>
        <span>{formatSoles(t.total)}</span>
      </p>
      {paymentLines(t).map(([label, cents]) => (
        <p key={label} className="flex justify-between tabular-nums">
          <span>{label}</span>
          <span>{formatSoles(cents)}</span>
        </p>
      ))}
      <p className="mt-2 text-center">{TICKET_THANKS}</p>
    </div>
  );
}

export function SaleTicketDialog({ ticket, onClose }: { ticket: TicketData; onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendWhatsApp = () => {
    const normalized = phone.trim() ? normalizePhone(phone) : undefined;
    if (normalized === null) return setError("Escribe un celular de 9 dígitos que empiece con 9");
    setError(null);
    window.open(whatsappUrl(ticketText(ticket), normalized), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Dialog open disablePointerDismissal onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Venta {ticket.ticketNumber} registrada</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-white p-3">
            <div className="mx-auto w-[72mm] max-w-full">
              <TicketBody t={ticket} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ticket-phone">Celular del cliente (opcional)</Label>
            <Input id="ticket-phone" inputMode="tel" placeholder="987 654 321" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!error} />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 [&_button]:px-2">
            <Button autoFocus onClick={() => window.print()}>
              <Printer aria-hidden /> Imprimir
            </Button>
            <Button variant="outline" onClick={sendWhatsApp}>
              <MessageCircle aria-hidden /> Enviar por WhatsApp
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
      {/* Copia solo para imprimir: cuelga directo del body para que el CSS de impresión oculte todo lo demás. */}
      {createPortal(
        <div id="ticket-print" className="hidden">
          <TicketBody t={ticket} />
        </div>,
        document.body,
      )}
    </>
  );
}
