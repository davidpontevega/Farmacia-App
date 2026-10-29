import { formatDateTime } from "./dates";
import { formatSoles } from "./money";
import type { PaymentMethod } from "./sales";

// Constancia de la venta (spec 025). Funciones puras: lo que se imprime y lo que se envía por WhatsApp sale de los mismos datos.
export type TicketData = {
  business: { name: string; ruc: string; address: string };
  ticketNumber: string;
  createdAt: string;
  userName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  yapeAmount: number;
  change: number;
};

export const TICKET_TITLE = "CONSTANCIA DE VENTA";
export const TICKET_DISCLAIMER = "No válida como comprobante de pago";
export const TICKET_THANKS = "Gracias por su compra";

export const itemSubtotal = (i: { quantity: number; unitPrice: number }) => i.quantity * i.unitPrice;

/** Montos de pago que se muestran: solo los que tienen valor, y el vuelto si lo hay. */
export function paymentLines(t: Pick<TicketData, "cashAmount" | "yapeAmount" | "change">) {
  const rows: [string, number][] = [];
  if (t.cashAmount > 0) rows.push(["Efectivo", t.cashAmount]);
  if (t.yapeAmount > 0) rows.push(["Yape / Plin", t.yapeAmount]);
  if (t.change > 0) rows.push(["Vuelto", t.change]);
  return rows;
}

/** Texto plano para WhatsApp (el `*` pone negrita). */
export function ticketText(t: TicketData) {
  const out = [
    `*${t.business.name}*`,
    `RUC ${t.business.ruc}`,
    t.business.address,
    "",
    `*${TICKET_TITLE}*`,
    TICKET_DISCLAIMER,
    `N° ${t.ticketNumber}`,
    formatDateTime(t.createdAt),
    `Cajero: ${t.userName || "—"}`,
    "",
  ];
  for (const i of t.items) out.push(`${i.quantity} x ${i.name}`, `   ${formatSoles(i.unitPrice)} c/u = ${formatSoles(itemSubtotal(i))}`);
  out.push("", `*TOTAL: ${formatSoles(t.total)}*`);
  for (const [label, cents] of paymentLines(t)) out.push(`${label}: ${formatSoles(cents)}`);
  out.push("", TICKET_THANKS);
  return out.join("\n");
}

/** Celular peruano de 9 dígitos que empieza con 9 (acepta +51, espacios y guiones). Devuelve «51…» o null. */
export function normalizePhone(input: string) {
  const digits = input.replace(/[\s-]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("51") && digits.length === 11 ? digits.slice(2) : digits;
  return /^9\d{8}$/.test(national) ? `51${national}` : null;
}

/** Sin número, WhatsApp deja elegir el contacto. */
export const whatsappUrl = (text: string, phone?: string) => `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
