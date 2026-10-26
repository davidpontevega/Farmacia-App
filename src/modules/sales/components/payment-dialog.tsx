"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSoles, isValidSoles, toCents } from "@/lib/money";
import { resolvePayment, type PaymentMethod } from "@/lib/sales";
import { useCreateSale } from "../hooks/use-sales";
import { useCartStore } from "../store/cart-store";
import { PAYMENT_LABEL } from "../types";

const METHODS: PaymentMethod[] = ["CASH", "YAPE", "MIXED"];
const centsOrUndefined = (v: string) => (isValidSoles(v) ? toCents(v) : undefined);

export function PaymentDialog({ total, onClose }: { total: number; onClose: () => void }) {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const sale = useCreateSale();

  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cash, setCash] = useState("");
  const [yape, setYape] = useState("");

  const cashTendered = method === "YAPE" ? undefined : centsOrUndefined(cash);
  const yapeAmount = method === "MIXED" ? centsOrUndefined(yape) : undefined;
  const payment = resolvePayment({ method, total, cashTendered, yapeAmount });
  const touched = method === "YAPE" || cash !== "" || yape !== "";

  const confirm = () =>
    sale.mutate(
      {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: method,
        cashTendered,
        yapeAmount,
        expectedTotal: total,
      },
      {
        onSuccess: (r) => {
          toast.success(
            `Venta ${r.ticketNumber} registrada${r.change > 0 ? ` · Vuelto ${formatSoles(r.change)}` : ""}`,
            { duration: 8000 },
          );
          clear();
          onClose();
        },
        // Un 409 (precios o stock) ya mostró su aviso: se cierra para revisar el carrito.
        // Con otro error se queda abierto para no perder los montos tecleados.
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) onClose();
        },
      },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && !sale.isPending && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar pago</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">Total a cobrar</p>
          <p className="text-3xl font-bold">{formatSoles(total)}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <Button
              key={m}
              variant={method === m ? "default" : "outline"}
              aria-pressed={method === m}
              onClick={() => {
                setMethod(m);
                setCash("");
                setYape("");
              }}
            >
              {PAYMENT_LABEL[m]}
            </Button>
          ))}
        </div>

        {method === "MIXED" && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="pay-yape">Yape / Plin (S/)</Label>
            <Input
              id="pay-yape"
              inputMode="decimal"
              value={yape}
              onChange={(e) => setYape(e.target.value)}
            />
          </div>
        )}
        {method !== "YAPE" && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="pay-cash">
              {method === "MIXED" ? "Efectivo recibido (S/)" : "Monto recibido (S/)"}
            </Label>
            <Input
              id="pay-cash"
              inputMode="decimal"
              autoFocus
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          </div>
        )}

        {touched && payment.ok && payment.change > 0 && (
          <p className="text-center text-lg font-semibold text-green-600">
            Vuelto: {formatSoles(payment.change)}
          </p>
        )}
        {touched && !payment.ok && (
          <p className="text-sm text-destructive" role="alert">
            {payment.error}
          </p>
        )}

        <Button size="lg" disabled={!payment.ok || sale.isPending} onClick={confirm}>
          {sale.isPending ? "Procesando…" : "Confirmar venta"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
