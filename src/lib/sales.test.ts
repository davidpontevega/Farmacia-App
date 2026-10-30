import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateFefo, cartCountLabel, cartTotal, formatTicket, resolvePayment } from "./sales";

test("FEFO reparte entre lotes en orden y respeta el stock de cada uno", () => {
  const lots = [
    { lotId: "A", stock: 3 },
    { lotId: "B", stock: 10 },
  ];
  assert.deepEqual(allocateFefo(lots, 5), [
    { lotId: "A", quantity: 3 },
    { lotId: "B", quantity: 2 },
  ]);
  assert.deepEqual(allocateFefo(lots, 2), [{ lotId: "A", quantity: 2 }]);
  assert.deepEqual(allocateFefo(lots, 13), [
    { lotId: "A", quantity: 3 },
    { lotId: "B", quantity: 10 },
  ]);
});

test("FEFO devuelve null si no alcanza y salta lotes sin stock", () => {
  assert.equal(allocateFefo([{ lotId: "A", stock: 3 }], 4), null);
  assert.equal(allocateFefo([], 1), null);
  assert.deepEqual(
    allocateFefo([{ lotId: "A", stock: 0 }, { lotId: "B", stock: 5 }], 2),
    [{ lotId: "B", quantity: 2 }],
  );
});

test("ticket con 8 dígitos", () => {
  assert.equal(formatTicket(1), "B001-00000001");
  assert.equal(formatTicket(12345678), "B001-12345678");
});

test("efectivo: se registra el total y el vuelto sale aparte", () => {
  assert.deepEqual(resolvePayment({ method: "CASH", total: 1250, cashTendered: 2000 }), {
    ok: true,
    cashAmount: 1250,
    yapeAmount: 0,
    change: 750,
  });
  assert.equal(resolvePayment({ method: "CASH", total: 1250, cashTendered: 1249 }).ok, false);
  assert.equal(resolvePayment({ method: "CASH", total: 1250 }).ok, false);
});

test("Yape: todo el total por Yape", () => {
  assert.deepEqual(resolvePayment({ method: "YAPE", total: 1250 }), {
    ok: true,
    cashAmount: 0,
    yapeAmount: 1250,
    change: 0,
  });
});

test("mixto: Yape 5, efectivo recibido 10 sobre 12.50 -> 7.50 netos y vuelto 2.50", () => {
  assert.deepEqual(
    resolvePayment({ method: "MIXED", total: 1250, yapeAmount: 500, cashTendered: 1000 }),
    { ok: true, cashAmount: 750, yapeAmount: 500, change: 250 },
  );
});

test("mixto rechaza Yape fuera de rango o efectivo insuficiente", () => {
  const base = { method: "MIXED" as const, total: 1250, cashTendered: 2000 };
  assert.equal(resolvePayment({ ...base, yapeAmount: 0 }).ok, false);
  assert.equal(resolvePayment({ ...base, yapeAmount: 1250 }).ok, false);
  assert.equal(resolvePayment({ ...base, yapeAmount: 500, cashTendered: 749 }).ok, false);
  assert.equal(resolvePayment({ ...base }).ok, false);
});

test("el total debe ser positivo", () => {
  assert.equal(resolvePayment({ method: "YAPE", total: 0 }).ok, false);
});

test("cartTotal suma precio por cantidad", () => {
  assert.equal(cartTotal([{ unitPrice: 250, quantity: 3 }, { unitPrice: 100, quantity: 2 }]), 950);
  assert.equal(cartTotal([]), 0);
});

test("cartCountLabel: vacío, singular y plural", () => {
  assert.equal(cartCountLabel(0), "Carrito vacío");
  assert.equal(cartCountLabel(1), "1 producto");
  assert.equal(cartCountLabel(3), "3 productos");
});
