import assert from "node:assert/strict";
import { test } from "node:test";
import { itemSubtotal, normalizePhone, paymentLines, ticketText, whatsappUrl, type TicketData } from "./ticket";

const base: TicketData = {
  business: { name: "NicFarma", ruc: "10710802004", address: "Jr. Daniel Alcides Carrión S/N, Sihuas - Áncash" },
  ticketNumber: "B001-00000007",
  createdAt: "2026-10-29T15:30:00.000Z",
  userName: "Ana",
  items: [
    { name: "Paracetamol 500 mg", quantity: 2, unitPrice: 150 },
    { name: "Ibuprofeno 400 mg", quantity: 1, unitPrice: 275 },
  ],
  total: 575,
  paymentMethod: "CASH",
  cashAmount: 575,
  yapeAmount: 0,
  change: 425,
};

test("subtotal por línea", () => {
  assert.equal(itemSubtotal(base.items[0]), 300);
});

test("pago en efectivo: efectivo y vuelto; sin Yape", () => {
  assert.deepEqual(paymentLines(base), [["Efectivo", 575], ["Vuelto", 425]]);
});

test("pago mixto sin vuelto: efectivo y Yape, sin línea de vuelto", () => {
  assert.deepEqual(paymentLines({ cashAmount: 300, yapeAmount: 275, change: 0 }), [["Efectivo", 300], ["Yape / Plin", 275]]);
});

test("texto de WhatsApp trae negocio, leyenda, líneas, total y pago", () => {
  const text = ticketText(base);
  for (const part of ["*NicFarma*", "RUC 10710802004", "*CONSTANCIA DE VENTA*", "No válida como comprobante de pago", "N° B001-00000007", "Cajero: Ana", "2 x Paracetamol 500 mg", "S/ 1.50 c/u = S/ 3.00", "1 x Ibuprofeno 400 mg", "*TOTAL: S/ 5.75*", "Vuelto: S/ 4.25", "Gracias por su compra"]) {
    assert.ok(text.includes(part), part);
  }
});

test("celular: 9 dígitos que empiezan con 9, con o sin +51", () => {
  assert.equal(normalizePhone("987 654 321"), "51987654321");
  assert.equal(normalizePhone("+51 987-654-321"), "51987654321");
  assert.equal(normalizePhone("51987654321"), "51987654321");
  assert.equal(normalizePhone("887654321"), null);
  assert.equal(normalizePhone("98765432"), null);
  assert.equal(normalizePhone("abc"), null);
});

test("URL de WhatsApp con y sin número, texto codificado", () => {
  assert.equal(whatsappUrl("a b\n&", "51987654321"), "https://wa.me/51987654321?text=a%20b%0A%26");
  assert.equal(whatsappUrl("hola"), "https://wa.me/?text=hola");
});
