import assert from "node:assert/strict";
import { test } from "node:test";
import { autoMatch, bestMatches, score, tokens, type CatalogName } from "./match";

const c = (id: string, commercialName: string, genericName: string | null = null, laboratory: string | null = null): CatalogName => ({
  id,
  commercialName,
  genericName,
  laboratory,
});

const catalog = [
  c("1", "Cloruro de sodio 0.9% 1000ml", null, "OQCORP"),
  c("2", "Cloruro de sodio 0.9% 100ml", null, "Pharmagen"),
  c("3", "Alcohol medicinal 70% 120ml", null, "Alkofarma"),
  c("4", "Alcohol puro 96% 120ml", null, "Alkofarma"),
  c("5", "Paracetamol gotas 100mg/ml 10ml", "Paracetamol", "Portugal"),
  c("6", "Ibuprofeno 400mg"),
];

test("tokens ignora tildes, mayúsculas, presentación y conectores", () => {
  assert.deepEqual(tokens("CLORURO DE SODIO 0.9% (100ML) PHARMAGEN X1"), ["cloruro", "sodio", "0.9", "100", "pharmagen"]);
  assert.deepEqual(tokens("Ketopan 100MG (5ML) SOL. INY. X 25"), ["ketopan", "100", "5"]);
  assert.deepEqual(tokens("500 MG"), tokens("500mg"));
});

test("misma descripción de otra forma puntúa alto", () => {
  assert.ok(score("CLORURO DE SODIO 0.9% (100ML) PHARMAGEN X1", "Cloruro de sodio 0.9% 100ml Pharmagen") > 0.9);
});

test("distingue presentaciones parecidas (100ml vs 1000ml)", () => {
  const [best] = bestMatches("CLORURO DE SODIO 0.9% (100ML) PHARMAGEN X1", catalog);
  assert.equal(best.product.id, "2");
});

test("autoMatch acepta una coincidencia clara", () => {
  const m = autoMatch("CLORURO DE SODIO 0.9% (1000ML) SOL. INY. OQCORP X 12", catalog);
  assert.equal(m?.product.id, "1");
});

test("autoMatch no adivina cuando hay dos candidatos parecidos", () => {
  assert.equal(autoMatch("ALCOHOL 120ML ALKOFARMA X 01", catalog), null);
});

test("autoMatch no adivina sin coincidencia real", () => {
  assert.equal(autoMatch("SONDA NASO-GASTRICA (8) MEDEX X 01", catalog), null);
});

test("un nombre corto del catálogo no se lleva cualquier descripción larga", () => {
  assert.equal(autoMatch("IBUPROFENO (100MG/5ML) 120ML SUSP. ORAL IQFARMA X 1", catalog)?.product.id ?? null, null);
});

test("searchByTerm: palabras parciales, sin tildes ni mayúsculas, todas deben aparecer", async () => {
  const { searchByTerm } = await import("./match");
  assert.deepEqual(searchByTerm("cloru sod 100", catalog).map((p) => p.id), ["1", "2"]);
  assert.deepEqual(searchByTerm("ALCOHOL puro", catalog).map((p) => p.id), ["4"]);
  assert.deepEqual(searchByTerm("zzz", catalog), []);
  assert.deepEqual(searchByTerm("  ", catalog), []);
});

test("la concentración distingue productos: 250 mg no se asigna a Amoxicilina 500mg ni a un nombre sin dosis", () => {
  const amox: CatalogName[] = [c("a1", "Amoxicilina 500mg"), c("a2", "Amoxicilina")];
  assert.equal(autoMatch("AMOXICILINA 250 MG CAP X 100", amox), null);
  assert.equal(autoMatch("AMOXICILINA 500 MG CAP", amox)?.product.id, "a1");
});

test("500 MG y 500mg son lo mismo al emparejar", () => {
  const ibu: CatalogName[] = [c("i1", "Ibuprofeno 400mg"), c("i2", "Ibuprofeno 600mg")];
  assert.equal(autoMatch("IBUPROFENO 400 MG MK", ibu)?.product.id, "i1");
});
