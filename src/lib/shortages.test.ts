import assert from "node:assert/strict";
import { test } from "node:test";
import { canAddSource, dedupeSince, shortageKey, toClipboardText, toCsv, type ShortageGroup } from "./shortages";

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

test("toCsv: una columna por dato, separadas por «;» y con BOM (Excel en español)", () => {
  const csv = toCsv([row(), row({ name: "Loratadina 10 mg", timesRequested: 1, totalQuantity: 5, lastAt: "2026-10-28T09:00:00.000Z" })]);
  const lines = csv.replace("\uFEFF", "").trimEnd().split("\r\n");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(lines[0], "Medicamento;Veces pedido;Cantidad total;Último pedido");
  assert.equal(lines[1], "Amoxicilina 500 mg;3;63;2026-10-27");
  assert.equal(lines[2], "Loratadina 10 mg;1;5;2026-10-28");
  assert.equal(lines.every((l) => l.split(";").length === 4), true);
});

test("toCsv: comillas, punto y coma y comas dentro del nombre no rompen las columnas", () => {
  const csv = toCsv([row({ name: 'Jarabe "X"; 5 mg, frasco' })]);
  assert.ok(csv.includes('"Jarabe ""X""; 5 mg, frasco";3;63;2026-10-27'));
});

test("toCsv: neutraliza fórmulas del nombre", () => {
  const csv = toCsv([row({ name: '=EVIL("x")' }), row({ name: "@SUM(A1)" })]);
  assert.ok(csv.includes(`"'=EVIL(""x"")";3;63;2026-10-27`));
  assert.ok(csv.includes("'@SUM(A1);3;63;2026-10-27"));
});
