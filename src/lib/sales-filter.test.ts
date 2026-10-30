import assert from "node:assert/strict";
import { test } from "node:test";
import { filterSales, yapeSummary } from "./sales-filter";

const sale = (yapeAmount: number, hasProof: boolean, status: "COMPLETED" | "VOIDED" = "COMPLETED") => ({ yapeAmount, hasProof, status });
const cash = sale(0, false);
const yapeProof = sale(1000, true);
const yapeNoProof = sale(500, false);
const mixed = sale(300, false);
const voided = sale(800, false, "VOIDED");
const all = [cash, yapeProof, yapeNoProof, mixed, voided];

test("«Todas» devuelve todo", () => assert.equal(filterSales(all, "ALL").length, 5));

test("«Yape / Plin»: puro, mixto y anulada; no efectivo", () => {
  assert.deepEqual(filterSales(all, "YAPE"), [yapeProof, yapeNoProof, mixed, voided]);
});

test("«Sin constancia»: solo completadas con Yape y sin foto", () => {
  assert.deepEqual(filterSales(all, "NO_PROOF"), [yapeNoProof, mixed]);
});

test("resumen: suma la parte de Yape, excluye anuladas y efectivo", () => {
  assert.deepEqual(yapeSummary(all), { count: 3, total: 1800, withProof: 1, withoutProof: 2 });
});

test("lista vacía", () => {
  assert.deepEqual(yapeSummary([]), { count: 0, total: 0, withProof: 0, withoutProof: 0 });
  assert.deepEqual(filterSales([], "YAPE"), []);
});
