import assert from "node:assert/strict";
import { test } from "node:test";
import { hasKeyword, interpret, matchProducts, requiresRx, normalize, SYMPTOM_GROUPS, type ConsultProduct } from "./symptoms";
import { missKey, MISS_RETENTION_DAYS, missesSince } from "./symptom-misses";

const product = (id: string, commercialName: string, genericName: string | null, sellableStock: number): ConsultProduct => ({
  id,
  commercialName,
  genericName,
  salePrice: 100,
  sellableStock,
  shelf: null,
  shelfRow: null,
});

test("el diccionario trae los 37 grupos con datos completos", () => {
  assert.equal(SYMPTOM_GROUPS.length, 37);
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
  assert.ok(!interpret("algo para el hipo").found);
  assert.ok(!interpret("crema para las arrugas").found);
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

const NEW = SYMPTOM_GROUPS.slice(23);

test("grupos nuevos: sus palabras clave no se solapan con las de ningún otro grupo", () => {
  assert.equal(NEW.length, 14);
  for (const g of NEW) {
    for (const k of g.keywords.map(normalize)) {
      for (const other of SYMPTOM_GROUPS.filter((o) => o !== g)) {
        for (const k2 of other.keywords.map(normalize)) {
          assert.ok(!hasKeyword(k, k2) && !hasKeyword(k2, k), `«${k}» (${g.description}) choca con «${k2}» (${other.description})`);
        }
      }
    }
  }
});

test("grupos nuevos: sin psicotrópicos, y los que exigen receta están marcados", () => {
  const all = NEW.flatMap((g) => g.ingredients);
  assert.ok(!all.some((i) => /alprazolam|clonazepam|diazepam|tramadol|morfina|codeina|pseudoefedrina|efedrina/.test(normalize(i))));
  for (const i of ["atorvastatina", "simvastatina", "alopurinol", "aciclovir", "ivermectina", "adapaleno", "clindamicina", "sulfadiazina de plata"]) assert.ok(requiresRx(i), i);
  assert.ok(!requiresRx("dexpantenol"));
});

test("grupos nuevos: una frase típica de cada uno lo encuentra", () => {
  const phrases: [string, string][] = [
    ["tengo muchos granos en la cara", "Para el acné y los granos"],
    ["me queme con agua caliente", "Para quemaduras leves y quemadura de sol"],
    ["me salio herpes", "Para el herpes labial"],
    ["tengo hemorroides", "Para hemorroides"],
    ["mi hijo tiene piojos", "Para piojos y liendres"],
    ["tengo la nariz tapada", "Para la congestión nasal y la sinusitis"],
    ["dolor de rodilla al caminar", "Para el dolor articular"],
    ["tengo las piernas cansadas", "Para piernas cansadas y várices"],
    ["me salieron aftas", "Para aftas y llagas en la boca"],
    ["pañalitis en el bebe", "Para pañalitis, rozaduras y dermatitis"],
    ["me pico un zancudo", "Para picaduras de insectos"],
    ["tengo el ojo seco", "Para el ojo seco"],
    ["tengo el colesterol alto", "Para el colesterol y el ácido úrico"],
    ["tiene deshidratacion", "Para la deshidratación"],
  ];
  for (const [phrase, description] of phrases) {
    const r = interpret(phrase);
    assert.ok(r.found, phrase);
    if (r.found) assert.equal(r.description, description, phrase);
  }
});

test("missKey: solo frases cortas, sin dígitos ni símbolos; todo normalizado", () => {
  assert.equal(missKey("  Pastilla para la PIEL "), "pastilla para la piel");
  assert.equal(missKey("dolor de cabeza?"), "dolor de cabeza");
  assert.equal(missKey("ab"), null);
  assert.equal(missKey("x".repeat(81)), null);
  assert.equal(missKey("uno dos tres cuatro cinco seis siete"), null); // 7 palabras
  assert.equal(missKey("uno dos tres cuatro cinco seis"), "uno dos tres cuatro cinco seis"); // 6
  assert.equal(missKey("juan perez 45 años"), null); // dígitos: puede traer la edad de un paciente
  assert.equal(missKey("correo@dominio.com"), null);
  assert.equal(missKey("dolor\u0000 de cabeza"), null);
});

test("missesSince: 90 días atrás", () => {
  assert.equal(MISS_RETENTION_DAYS, 90);
  assert.equal(missesSince(new Date("2026-10-27T12:00:00Z")).toISOString(), "2026-07-29T12:00:00.000Z");
});

test("hasKeyword: al comienzo de una palabra, sin tomar «ojos» de «piojos»", () => {
  assert.ok(hasKeyword("me duelen los ojos", "ojos"));
  assert.ok(!hasKeyword("mi hijo tiene piojos", "ojos"));
  assert.ok(hasKeyword("tengo alergias", "alergia")); // plural
  assert.ok(hasKeyword("dolor de cabeza fuerte", "dolor de cabeza"));
  assert.ok(!hasKeyword("tengo mucha postura", "tos"));
});
