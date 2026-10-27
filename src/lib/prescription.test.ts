import assert from "node:assert/strict";
import { test } from "node:test";
import { mainTerm, MAX_PRESCRIPTION_LINES, parseLine, parsePrescription, rankLine } from "./prescription";

test("parseLine: cantidad con «x», «#» y al inicio", () => {
  assert.deepEqual(parseLine("Amoxicilina 500 mg x 21"), { raw: "Amoxicilina 500 mg x 21", description: "Amoxicilina 500 mg", quantity: 21 });
  assert.equal(parseLine("paracetamol 500mg #10")?.quantity, 10);
  assert.equal(parseLine("paracetamol x10")?.quantity, 10);
  const lead = parseLine("2 paracetamol 500");
  assert.equal(lead?.quantity, 2);
  assert.equal(lead?.description, "paracetamol 500");
});

test("parseLine: «x 14 cápsulas» y formas tras la cantidad", () => {
  const r = parseLine("Omeprazol 20 mg x 14 cápsulas");
  assert.equal(r?.quantity, 14);
  assert.equal(r?.description, "Omeprazol 20 mg");
  assert.equal(parseLine("Ibuprofeno 400 mg x 10 tab")?.quantity, 10);
});

test("parseLine: sin cantidad es 1 y una concentración al inicio no es cantidad", () => {
  assert.equal(parseLine("Ibuprofeno 400 mg")?.quantity, 1);
  assert.equal(parseLine("500 mg paracetamol")?.quantity, 1);
  assert.equal(parseLine("500 mg paracetamol")?.description, "500 mg paracetamol");
});

test("parseLine: vacía, solo número y tope de cantidad", () => {
  assert.equal(parseLine("   "), null);
  assert.equal(parseLine("x 5"), null);
  assert.equal(parseLine("loratadina x 99999")?.quantity, 1); // 5 cifras: no se toma como cantidad
  assert.equal(parseLine("loratadina x 0")?.quantity, 1);
});

test("parsePrescription: salta líneas vacías y avisa lo que pasa de 30", () => {
  const text = Array.from({ length: 33 }, (_, i) => `producto${i} x 2\n\n`).join("");
  const r = parsePrescription(text);
  assert.equal(r.lines.length, MAX_PRESCRIPTION_LINES);
  assert.equal(r.ignored, 3);
});

test("mainTerm: primera palabra de letras con 4 o más caracteres", () => {
  assert.equal(mainTerm("Amoxicilina 500 mg"), "amoxicilina");
  assert.equal(mainTerm("500 mg paracetamol"), "paracetamol");
  assert.equal(mainTerm("x 12"), null);
  assert.equal(mainTerm("Jarabe de ambroxol"), "ambroxol");
  assert.equal(mainTerm("10 tabletas de paracetamol"), "paracetamol");
});

const p = (id: string, commercialName: string, genericName: string | null, sellableStock: number) => ({ id, commercialName, genericName, laboratory: null, sellableStock });

test("rankLine: coincidencia clara con stock se sugiere; sin stock o dudosa, no", () => {
  const catalog = [p("1", "Amoxidal 500 mg", "Amoxicilina", 5), p("2", "Panadol", "Paracetamol", 9)];
  assert.equal(rankLine("Amoxicilina 500 mg", catalog).suggestedId, "1");
  assert.equal(rankLine("Amoxicilina 500 mg", [p("1", "Amoxidal 500 mg", "Amoxicilina", 0)]).suggestedId, null);
  const dup = [p("1", "Paracetamol MK 500 mg", null, 3), p("2", "Paracetamol Genfar 500 mg", null, 3)];
  const r = rankLine("Paracetamol 500 mg", dup);
  assert.equal(r.suggestedId, null);
  assert.equal(r.candidates.length, 2);
});

test("rankLine: un número de concentración distinto no se sugiere solo", () => {
  const r = rankLine("Amoxicilina 250 mg", [p("1", "Amoxidal 500 mg", "Amoxicilina", 5)]);
  assert.equal(r.suggestedId, null);
  assert.equal(r.candidates.length, 1);
});
