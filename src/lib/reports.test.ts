import assert from "node:assert/strict";
import { test } from "node:test";
import {
  centsText,
  daysBetween,
  expiryBucket,
  fillDays,
  isStockAlert,
  marginPct,
  quickRange,
  rangeError,
  stockStatus,
  toCsv,
} from "./reports";

const TODAY = "2026-10-26";

test("rangeError: válido, invertido, futuro, demasiado largo, fecha falsa", () => {
  assert.equal(rangeError(TODAY, TODAY, TODAY), null);
  assert.equal(rangeError("2026-01-01", TODAY, TODAY), null);
  assert.match(rangeError("2026-10-27", "2026-10-26", TODAY)!, /posterior/);
  assert.match(rangeError("2026-10-20", "2026-10-27", TODAY)!, /futura/);
  assert.match(rangeError("2025-01-01", TODAY, TODAY)!, /366/);
  assert.equal(rangeError("2025-10-26", TODAY, TODAY), null); // 366 días exactos (2026-10-26 − 365)
  assert.match(rangeError("2026-02-30", TODAY, TODAY)!, /inválida/);
});

test("daysBetween cuenta días calendario, también con cambio de año y bisiesto", () => {
  assert.equal(daysBetween("2026-10-26", "2026-10-27"), 1);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
  assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2);
  assert.equal(daysBetween("2026-10-26", "2026-10-20"), -6);
});

test("quickRange", () => {
  assert.deepEqual(quickRange("today", TODAY), { from: TODAY, to: TODAY });
  assert.deepEqual(quickRange("yesterday", TODAY), { from: "2026-10-25", to: "2026-10-25" });
  assert.deepEqual(quickRange("last7", TODAY), { from: "2026-10-20", to: TODAY });
  assert.deepEqual(quickRange("month", TODAY), { from: "2026-10-01", to: TODAY });
  assert.deepEqual(quickRange("yesterday", "2026-03-01"), { from: "2026-02-28", to: "2026-02-28" });
});

test("stockStatus e isStockAlert", () => {
  assert.equal(stockStatus(0, 5), "OUT");
  assert.equal(stockStatus(0, 0), "OUT");
  assert.equal(stockStatus(5, 5), "LOW");
  assert.equal(stockStatus(6, 5), "OK");
  assert.equal(stockStatus(3, 0), "OK"); // sin mínimo definido nunca es «bajo»
  assert.ok(isStockAlert(0, 5));
  assert.ok(isStockAlert(5, 5));
  assert.ok(!isStockAlert(6, 5));
  assert.ok(!isStockAlert(0, 0));
});

test("expiryBucket", () => {
  assert.equal(expiryBucket(-1, 30), "expired");
  assert.equal(expiryBucket(0, 30), "soon");
  assert.equal(expiryBucket(30, 30), "soon");
  assert.equal(expiryBucket(31, 30), null);
  assert.equal(expiryBucket(31, 60), "soon");
});

test("marginPct", () => {
  assert.equal(marginPct(250, 1000), 25);
  assert.equal(marginPct(333, 1000), 33.3);
  assert.equal(marginPct(-100, 1000), -10);
  assert.equal(marginPct(0, 0), null);
});

test("fillDays rellena los días sin ventas y netea devoluciones", () => {
  const rows = fillDays(
    "2026-10-24",
    "2026-10-26",
    [{ date: "2026-10-24", count: 2, gross: 5000 }, { date: "2026-10-26", count: 1, gross: 1000 }],
    [{ date: "2026-10-25", refunded: 300 }],
  );
  assert.deepEqual(rows, [
    { date: "2026-10-24", salesCount: 2, grossCents: 5000, refundCents: 0, netCents: 5000 },
    { date: "2026-10-25", salesCount: 0, grossCents: 0, refundCents: 300, netCents: -300 },
    { date: "2026-10-26", salesCount: 1, grossCents: 1000, refundCents: 0, netCents: 1000 },
  ]);
});

test("centsText", () => {
  assert.equal(centsText(12345), "123.45");
  assert.equal(centsText(5), "0.05");
  assert.equal(centsText(-250), "-2.50");
  assert.equal(centsText(0), "0.00");
});

test("toCsv: BOM, separador ;, comillas y saltos o ; dentro de una celda", () => {
  const csv = toCsv(["Producto", "Valor"], [["Paracetamol, 500 mg", "12.50"], ['Dice "hola"', "1"], ["línea\nnueva", 3], ["vacío", null]]);
  assert.ok(csv.startsWith("﻿Producto;Valor\r\n"));
  assert.ok(csv.includes('"Paracetamol, 500 mg";12.50'));
  assert.ok(csv.includes('"Dice ""hola""";1'));
  assert.ok(csv.includes('"línea\nnueva";3'));
  assert.ok(csv.includes("vacío;\r\n"));
  assert.ok(csv.endsWith("\r\n"));
});

test("toCsv neutraliza celdas que Excel tomaría por fórmula, pero no los números negativos", () => {
  const csv = toCsv(["a"], [["=SUM(A1)"], ["+1"], ["@x"], [-5], ["normal"]]);
  assert.ok(csv.includes("'=SUM(A1)"));
  assert.ok(csv.includes("'+1"));
  assert.ok(csv.includes("'@x"));
  assert.ok(csv.includes("\r\n-5\r\n"));
  assert.ok(csv.includes("\r\nnormal\r\n"));
});

test("toCsv deja los importes negativos como número y sigue neutralizando fórmulas con guion", () => {
  const csv = toCsv(["a"], [[centsText(-150)], ["-1.50"], ["-SUM(A1)"], ["-"]]);
  assert.ok(csv.includes("\r\n-1.50\r\n"));
  assert.ok(!csv.includes("'-1.50"));
  assert.ok(csv.includes("'-SUM(A1)"));
  assert.ok(csv.includes("'-\r\n"));
});
