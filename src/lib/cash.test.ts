import assert from "node:assert/strict";
import { test } from "node:test";
import { closeDifferences, expectedCash, expectedYape } from "./cash";

const base = { opening: 10000, cashSales: 5000, yapeSales: 3000, withdrawals: 0, exchanges: 0 };

test("recién abierto: efectivo = apertura, Yape = 0", () => {
  const t = { opening: 10000, cashSales: 0, yapeSales: 0, withdrawals: 0, exchanges: 0 };
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
