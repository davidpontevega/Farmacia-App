import assert from "node:assert/strict";
import { test } from "node:test";
import { cashHeldByMessage, closeDifferences, closingValues, expectedCash, expectedYape, isShiftStale, staleShiftMessage } from "./cash";

const base = { opening: 10000, cashSales: 5000, yapeSales: 3000, withdrawals: 0, exchanges: 0, refunds: 0 };

test("recién abierto: efectivo = apertura, Yape = 0", () => {
  const t = { opening: 10000, cashSales: 0, yapeSales: 0, withdrawals: 0, exchanges: 0, refunds: 0 };
  assert.equal(expectedCash(t), 10000);
  assert.equal(expectedYape(t), 0);
});

test("un retiro baja el efectivo esperado", () => {
  assert.equal(expectedCash({ ...base, withdrawals: 2000 }), 13000);
  assert.equal(expectedYape({ ...base, withdrawals: 2000 }), 3000);
});

test("un canje baja el efectivo y sube el Yape esperados en lo mismo", () => {
  const t = { ...base, exchanges: 3000 };
  assert.equal(expectedCash(t), 12000);
  assert.equal(expectedYape(t), 6000);
});

test("cuadre exacto: diferencias en cero", () => {
  const d = closeDifferences(base, { cash: 15000, yape: 3000 });
  assert.deepEqual(d, {
    expectedCash: 15000,
    expectedYape: 3000,
    differenceCash: 0,
    differenceYape: 0,
    difference: 0,
  });
});

test("sobra y falta se reportan por método con signo", () => {
  const d = closeDifferences(base, { cash: 14800, yape: 3100 });
  assert.equal(d.differenceCash, -200);
  assert.equal(d.differenceYape, 100);
  assert.equal(d.difference, -100);
});

test("un faltante en efectivo no se compensa a ojos del detalle con un sobrante Yape", () => {
  const d = closeDifferences(base, { cash: 14000, yape: 4000 });
  assert.equal(d.difference, 0);
  assert.equal(d.differenceCash, -1000);
  assert.equal(d.differenceYape, 1000);
});

test("una devolución baja el efectivo esperado y no toca el Yape", () => {
  const t = { ...base, refunds: 750 };
  assert.equal(expectedCash(t), 14250);
  assert.equal(expectedYape(t), 3000);
  assert.equal(closeDifferences(t, { cash: 14250, yape: 3000 }).difference, 0);
});

test("isShiftStale: el día cambia a medianoche de Lima (UTC-5)", () => {
  const openedAt = new Date("2026-10-27T15:00:00Z"); // 10:00 del 27 en Lima
  assert.equal(isShiftStale(openedAt, new Date("2026-10-28T04:59:59Z")), false); // 23:59:59 del 27
  assert.equal(isShiftStale(openedAt, new Date("2026-10-28T05:00:00Z")), true); // 00:00 del 28
  assert.equal(isShiftStale(openedAt, new Date("2026-10-27T15:00:01Z")), false);
});

test("isShiftStale: abierto de noche el último día del mes, vencido el día 1", () => {
  const openedAt = new Date("2026-10-31T23:00:00Z"); // 18:00 del 31 en Lima
  assert.equal(isShiftStale(openedAt, new Date("2026-11-01T04:59:00Z")), false);
  assert.equal(isShiftStale(openedAt, new Date("2026-11-01T05:00:00Z")), true);
});

test("mensajes de turno vencido y de caja ocupada", () => {
  assert.match(staleShiftMessage(new Date("2026-10-27T15:00:00Z")), /^Tu turno es del .*27.*Ciérralo para continuar$/);
  assert.match(cashHeldByMessage("Ana", new Date("2026-10-27T15:00:00Z")), /^La caja está abierta por Ana desde .* debe cerrarse antes de abrir otro turno$/);
});

test("closingValues con conteo: el cuadre de siempre", () => {
  const c = closingValues(base, { cash: 14000, yape: 3000 });
  assert.deepEqual(c.values, { systemAmount: 18000, countedCash: 14000, countedYape: 3000, closingAmount: 17000, difference: -1000 });
  assert.deepEqual(c.differences, { differenceCash: -1000, differenceYape: 0, difference: -1000 });
});

test("closingValues sin cuadre: lo contado y la diferencia quedan nulos, no cero", () => {
  const c = closingValues(base, null);
  assert.deepEqual(c.values, { systemAmount: 18000, countedCash: null, countedYape: null, closingAmount: null, difference: null });
  assert.equal(c.differences, null);
  assert.equal(c.expectedCash, 15000);
  assert.equal(c.expectedYape, 3000);
});
