import assert from "node:assert/strict";
import { test } from "node:test";
import { canAddSource, csvCell, dedupeSince, shortageKey, toClipboardText, toCsv, type ShortageGroup } from "./shortages";

const row = (over: Partial<ShortageGroup> = {}): ShortageGroup => ({
  nameKey: "amoxicilina 500 mg",
  name: "Amoxicilina 500 mg",
  timesRequested: 3,
  totalQuantity: 63,
  lastAt: "2026-10-27T15:00:00.000Z",
  lastBy: "Ana",
  ...over,
});

test("shortageKey: tildes, mayúsculas y espacios", () => {
  assert.equal(shortageKey("  Ácido  Fólico 5 MG "), "acido folico 5 mg");
  assert.equal(shortageKey("AMOXICILINA 500 mg"), shortageKey("amoxicilina   500 mg"));
});

test("canAddSource: la anotación manual exige shortages.update", () => {
  assert.ok(canAddSource("PRESCRIPTION", ["shortages.create"]));
  assert.ok(!canAddSource("MANUAL", ["shortages.create"]));
  assert.ok(canAddSource("MANUAL", ["shortages.create", "shortages.update"]));
});

test("dedupeSince: 10 minutos atrás", () => {
  assert.equal(dedupeSince(new Date("2026-10-27T12:00:00Z")).toISOString(), "2026-10-27T11:50:00.000Z");
});

test("toClipboardText: una línea por medicamento", () => {
  assert.equal(toClipboardText([row(), row({ name: "Loratadina 10 mg", totalQuantity: 5 })]), "Amoxicilina 500 mg — 63\nLoratadina 10 mg — 5");
  assert.equal(toClipboardText([]), "");
});

test("csvCell: comillas, comas y saltos se escapan", () => {
  assert.equal(csvCell("simple"), "simple");
  assert.equal(csvCell('con "comillas"'), '"con ""comillas"""');
  assert.equal(csvCell("a, b"), '"a, b"');
  assert.equal(csvCell("a;b"), '"a;b"');
  assert.equal(csvCell("a\nb"), '"a\nb"');
  assert.equal(csvCell(12), "12");
});

test("csvCell: neutraliza fórmulas de Excel", () => {
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("+cmd"), "'+cmd");
  assert.equal(csvCell("-2+3"), "'-2+3");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.ok(csvCell("\t=x").startsWith("'"));
});

test("toCsv: cabecera, filas y fecha corta", () => {
  const csv = toCsv([row({ name: '=EVIL("x")' })]);
  const [head, line] = csv.split("\r\n");
  assert.equal(head, "Medicamento,Veces pedido,Cantidad total,Último pedido");
  assert.equal(line, `"'=EVIL(""x"")",3,63,2026-10-27`);
});
