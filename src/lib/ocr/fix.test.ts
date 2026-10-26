import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOcrRow, editDistance, normalizeUm, parseDecimal, type RowReads } from "./fix";

const cell = (text: string, confidence = 90) => ({ text, confidence });

// Lecturas reales (columna por columna) de la cotización de HealTec: [código, cant, UM, fecha, precio, total]
// y el valor correcto, medidas con el OCR gratuito sobre la copia de 812 px.
const REAL: { n: number; read: string[]; truth: { price: string; total: string } }[] = [
  { n: 1, read: ["Q00047", "3", "XEADE", "31/12/2028", "48.00", "144.0"], truth: { price: "48.00", total: "144.00" } },
  { n: 2, read: ["CLO004", "5", "UND", "30/06/2028", "1.80", "9.0"], truth: { price: "1.80", total: "9.00" } },
  { n: 3, read: ["KETO001", "2", "CAJ", "30/10/2028", "62.50", "125.0"], truth: { price: "62.50", total: "125.00" } },
  { n: 5, read: ["SON0O013", "4", "OB", "30/09/2030", "2.00", "8.0"], truth: { price: "2.00", total: "8.00" } },
  { n: 6, read: ["CIPODO1", "15", "CAJ", "", "2.50", "37.5"], truth: { price: "2.50", total: "37.50" } },
  { n: 9, read: ["AZI0005", "2", "FCO", "30/09/2028", "9.50", "11.0"], truth: { price: "5.50", total: "11.00" } }, // precio mal leído
  { n: 10, read: ["15U0009", "4", "CAJ", "28/02/2027", "4.50", "18.0"], truth: { price: "4.50", total: "18.00" } },
  { n: 15, read: ["BOLODOS", "1", "PAQ", "31/07/2028", "52.50", "52.5"], truth: { price: "52.50", total: "52.50" } },
];

const reads = (r: string[], desc = "ALGO X 25"): RowReads => ({
  code: cell(r[0]),
  qty: cell(r[1]),
  um: cell(r[2]),
  desc: cell(desc),
  date: cell(r[3]),
  price: cell(r[4]),
  total: cell(r[5]),
});

test("normalizeUm: exacta, ajustada si hay una única candidata, vacía si es dudosa", () => {
  assert.deepEqual(normalizeUm("CAJ"), { value: "CAJ", status: "ok" });
  assert.deepEqual(normalizeUm("UNO"), { value: "UND", status: "fixed" });
  assert.deepEqual(normalizeUm("OB"), { value: "SOB", status: "fixed" }); // también BOL difiere en 2: una sola candidata
  assert.deepEqual(normalizeUm("XEADE"), { value: "", status: "unknown" });
  assert.deepEqual(normalizeUm(""), { value: "", status: "unknown" });
  assert.deepEqual(normalizeUm("caj."), { value: "CAJ", status: "ok" });
});

test("editDistance", () => {
  assert.equal(editDistance("UNO", "UND"), 1);
  assert.equal(editDistance("OB", "SOB"), 1);
  assert.equal(editDistance("CAJ", "CAJ"), 0);
  assert.equal(editDistance("", "ABC"), 3);
});

test("parseDecimal", () => {
  assert.equal(parseDecimal("144.0"), "144.0");
  assert.equal(parseDecimal("1,80"), "1.80");
  assert.equal(parseDecimal(" 62.50 "), "62.50");
  assert.equal(parseDecimal("1.234"), null);
  assert.equal(parseDecimal("12.5C"), null);
  assert.equal(parseDecimal(""), null);
});

test("una fila bien leída no tiene dudas, salvo el código si no tiene la forma esperada", () => {
  const row = buildOcrRow(3, reads(["KET0001", "2", "CAJ", "30/10/2028", "62.50", "125.00"]))!;
  assert.deepEqual(row.uncertain, []);
  assert.equal(row.qty, "2");
  assert.equal(row.supplierCode, "KET0001");
});

test("códigos mal leídos quedan marcados y NO se corrigen (una corrección plausible pero falsa sería peor)", () => {
  for (const r of REAL.filter((x) => ["SON0O013", "CIPODO1", "15U0009", "BOLODOS", "Q00047"].includes(x.read[0]))) {
    const row = buildOcrRow(r.n, reads(r.read))!;
    assert.ok(row.uncertain.includes("supplierCode"), r.read[0]);
    assert.equal(row.supplierCode, r.read[0].toUpperCase().replace(/[^A-ZÑ0-9]/g, ""));
  }
});

test("unidad mal leída: ajustada y marcada, o vacía y marcada", () => {
  const unknown = buildOcrRow(1, reads(REAL[0].read))!;
  assert.equal(unknown.um, "");
  assert.ok(unknown.uncertain.includes("um"));
  const fixed = buildOcrRow(5, reads(REAL[3].read))!;
  assert.equal(fixed.um, "SOB");
  assert.ok(fixed.uncertain.includes("um"));
});

test("el precio mal leído (9.50 en vez de 5.50) queda marcado por cantidad × precio ≠ total", () => {
  const row = buildOcrRow(9, reads(REAL[5].read))!;
  assert.ok(row.uncertain.includes("packagePrice"));
  assert.ok(row.uncertain.includes("lineTotal"));
});

test("los totales con un decimal perdido (144.0, 37.5) no se marcan si la cuenta cuadra", () => {
  for (const n of [1, 2, 3, 6, 10, 15]) {
    const r = REAL.find((x) => x.n === n)!;
    const row = buildOcrRow(n, reads(r.read))!;
    assert.ok(!row.uncertain.includes("packagePrice"), `fila ${n}`);
    assert.ok(!row.uncertain.includes("lineTotal"), `fila ${n}`);
  }
});

test("la fila sin vencimiento (CIPRONOR) sale con el vencimiento vacío, sin marcarlo como dudoso", () => {
  const row = buildOcrRow(6, reads(REAL[4].read))!;
  assert.equal(row.expiry, "");
  assert.ok(!row.uncertain.includes("expiry"));
});

test("un vencimiento ilegible o de poca confianza se marca", () => {
  const bad = buildOcrRow(1, { ...reads(REAL[0].read), date: cell("31/1?/2028") })!;
  assert.ok(bad.uncertain.includes("expiry"));
  const lowConf = buildOcrRow(1, { ...reads(REAL[0].read), date: cell("31/12/2028", 40) })!;
  assert.ok(lowConf.uncertain.includes("expiry"));
});

test("cantidad ilegible, vacía o de poca confianza se marca", () => {
  assert.ok(buildOcrRow(1, { ...reads(REAL[0].read), qty: cell("") })!.uncertain.includes("qty"));
  assert.ok(buildOcrRow(1, { ...reads(REAL[0].read), qty: cell("3", 30) })!.uncertain.includes("qty"));
  assert.ok(buildOcrRow(1, { ...reads(REAL[0].read), qty: cell("0") })!.uncertain.includes("qty"));
});

test("una fila vacía se descarta", () => {
  assert.equal(buildOcrRow(7, {}), null);
  assert.equal(buildOcrRow(7, { code: cell("ABC1234") }), null);
});

test("un vencimiento muy lejano (2078) o ya pasado se marca; uno normal no", () => {
  const today = "2026-10-26";
  const at = (d: string) => buildOcrRow(14, { ...reads(REAL[0].read), date: cell(d) }, today)!.uncertain;
  assert.ok(at("01/09/2078").includes("expiry"));
  assert.ok(at("01/09/2020").includes("expiry"));
  assert.ok(!at("01/09/2028").includes("expiry"));
});
