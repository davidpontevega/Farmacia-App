import assert from "node:assert/strict";
import { test } from "node:test";
import { interpret, matchProducts, requiresRx, normalize, SYMPTOM_GROUPS, type ConsultProduct } from "./symptoms";

const product = (id: string, commercialName: string, genericName: string | null, sellableStock: number): ConsultProduct => ({
  id,
  commercialName,
  genericName,
  salePrice: 100,
  sellableStock,
  shelf: null,
  shelfRow: null,
});

test("el diccionario trae los 23 grupos con datos completos", () => {
  assert.equal(SYMPTOM_GROUPS.length, 23);
  for (const g of SYMPTOM_GROUPS) {
    assert.ok(g.keywords.length && g.ingredients.length && g.category && g.description);
  }
});

test("normalize: sin tildes, sin mayúsculas, espacios simples; ñ pasa a n", () => {
  assert.equal(normalize("  Cefálea   FUERTE "), "cefalea fuerte");
  assert.equal(normalize("Riñones"), "rinones");
});

test("interpret por frase: ignora tildes y mayúsculas y junta grupos sin repetir principios", () => {
  const r = interpret("Tengo CEFÁLEA y fiebre");
  assert.ok(r.found);
  if (r.found) {
    assert.equal(r.description, "Para el dolor de cabeza y cefalea");
    assert.equal(r.ingredients.filter((i) => i === "paracetamol").length, 1);
    assert.ok(r.ingredients.includes("metamizol"));
  }
});

test("interpret: «pastilla para los riñones» llega al grupo urinario", () => {
  const r = interpret("pastilla para los riñones");
  assert.ok(r.found);
  if (r.found) assert.ok(r.ingredients.includes("nitrofurantoina"));
});

test("interpret palabra por palabra cuando no hay frase completa", () => {
  const r = interpret("gastritica");
  assert.ok(!r.found); // «gastritica» no está contenida en ninguna clave
  const w = interpret("quiero omeprazol");
  assert.ok(w.found); // palabra de más de 3 letras contenida en un principio
});

test("interpret: palabras de relleno como «para» no inventan coincidencias", () => {
  assert.ok(!interpret("pastilla para la piel").found);
  assert.ok(!interpret("algo para el acne").found);
  assert.ok(!interpret("crema para quemaduras").found);
  assert.ok(interpret("algo para la tos").found);
});

test("interpret sin coincidencias ofrece 6 sugerencias", () => {
  const r = interpret("xyz");
  assert.ok(!r.found);
  if (!r.found) assert.equal(r.suggestions.length, 6);
});

test("matchProducts: por nombre comercial o genérico, con stock primero", () => {
  const catalog = [
    product("1", "Ibuprax 400", "Ibuprofeno", 0),
    product("2", "Paracetamol MK 500", null, 5),
    product("3", "Vitamina C", null, 2),
  ];
  const r = matchProducts(["paracetamol", "ibuprofeno", "naproxeno"], catalog);
  assert.deepEqual(r.products.map((p) => p.id), ["2", "1"]);
  assert.deepEqual(r.references, ["naproxeno"]);
});

test("matchProducts: un producto sin genérico no coincide con todo", () => {
  const r = matchProducts(["paracetamol"], [product("1", "Jarabe de miel", null, 3)]);
  assert.deepEqual(r.products, []);
  assert.deepEqual(r.references, ["paracetamol"]);
});

test("matchProducts: tildes en el catálogo y máximo 3 referencias", () => {
  const r = matchProducts(["acido folico", "zz1", "zz2", "zz3", "zz4"], [product("1", "Ácido Fólico 5 mg", null, 1)]);
  assert.deepEqual(r.products.map((p) => p.id), ["1"]);
  assert.equal(r.references.length, 3);
});

test("receta: antibióticos marcados, psicotrópicos fuera del diccionario", () => {
  assert.ok(requiresRx("Amoxicilina"));
  assert.ok(!requiresRx("paracetamol"));
  assert.ok(!SYMPTOM_GROUPS.some((g) => g.ingredients.includes("alprazolam")));
  const r = matchProducts(["amoxicilina", "paracetamol"], [product("1", "Amoxidal", "Amoxicilina 500", 5), product("2", "Panadol", "Paracetamol", 5)]);
  assert.deepEqual(r.products.map((p) => [p.id, p.requiresRx]), [["1", true], ["2", false]]);
});
