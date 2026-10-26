import assert from "node:assert/strict";
import { test } from "node:test";
import { canAdjust, getStockStatus } from "./stock";

const today = "2027-01-10";
const base = { stock: 100, minStock: 10, nextExpiry: "2028-01-01", today };

test("estado ok", () => {
  assert.equal(getStockStatus(base), "ok");
  assert.equal(getStockStatus({ ...base, nextExpiry: null }), "ok");
});

test("agotado gana a todo", () => {
  assert.equal(getStockStatus({ ...base, stock: 0, nextExpiry: "2020-01-01" }), "out");
});

test("vencido: el lote con stock ya venció", () => {
  assert.equal(getStockStatus({ ...base, nextExpiry: "2027-01-09" }), "expired");
});

test("por vencer: hoy hasta hoy + 30 días inclusive", () => {
  assert.equal(getStockStatus({ ...base, nextExpiry: "2027-01-10" }), "expiring");
  assert.equal(getStockStatus({ ...base, nextExpiry: "2027-02-09" }), "expiring");
  assert.equal(getStockStatus({ ...base, nextExpiry: "2027-02-10" }), "ok");
});

test("por vencer gana a stock bajo; stock bajo incluye el mínimo", () => {
  assert.equal(getStockStatus({ ...base, stock: 5, nextExpiry: "2027-01-20" }), "expiring");
  assert.equal(getStockStatus({ ...base, stock: 10 }), "low");
  assert.equal(getStockStatus({ ...base, stock: 11 }), "ok");
});

test("canAdjust", () => {
  assert.equal(canAdjust(20, -5), true);
  assert.equal(canAdjust(20, -20), true);
  assert.equal(canAdjust(20, -25), false);
  assert.equal(canAdjust(20, 0), false);
  assert.equal(canAdjust(20, 1.5), false);
  assert.equal(canAdjust(0, 10), true);
});
