import assert from "node:assert/strict";
import { test } from "node:test";
import { aliasError, aliasesError, ALIAS_MAX, cleanAlias, matchedAlias, MAX_ALIASES } from "./aliases";
import { createProductSchema, updateProductSchema } from "@/modules/products/schemas";
import { autoMatch, bestMatches, searchByTerm, type CatalogName } from "./match";

test("cleanAlias: espacios simples", () => {
  assert.equal(cleanAlias("  Ondansetrón   8 mg "), "Ondansetrón 8 mg");
});

test("aliasError: largo y caracteres de control", () => {
  assert.equal(aliasError("Ondansetrón"), null);
  assert.ok(aliasError("x"));
  assert.ok(aliasError("x".repeat(ALIAS_MAX + 1)));
  assert.equal(aliasError("x".repeat(ALIAS_MAX)), null);
  assert.ok(aliasError("Ond\u0000an"));
});

test("aliasesError: tope, repetidos con tildes y mayúsculas, e igual al nombre comercial", () => {
  assert.equal(aliasesError([], "Ondaprim"), null);
  assert.equal(aliasesError(["Ondansetrón", "Zofran"], "Ondaprim"), null);
  assert.ok(aliasesError(["Ondansetrón", "ONDANSETRON"], "Ondaprim"));
  assert.ok(aliasesError(["ONDAPRIM"], "Ondaprim"));
  assert.ok(aliasesError(Array.from({ length: MAX_ALIASES + 1 }, (_, i) => `alias ${i}`)));
  assert.equal(aliasesError(Array.from({ length: MAX_ALIASES }, (_, i) => `alias ${i}`)), null);
});

const product = { commercialName: "ONDAPRIM 8MG AMP", genericName: null, aliases: ["Ondansetrón", "Zofran"] };

test("matchedAlias: solo cuando el alias explica la coincidencia", () => {
  assert.equal(matchedAlias(product, ["ondansetron"]), "Ondansetrón");
  assert.equal(matchedAlias(product, ["zofr"]), "Zofran");
  assert.equal(matchedAlias(product, ["ondaprim"]), null); // lo explica el nombre comercial
  assert.equal(matchedAlias(product, ["paracetamol"]), null);
  assert.equal(matchedAlias(product, []), null);
});

const cat = (id: string, commercialName: string, aliases?: string[]): CatalogName => ({ id, commercialName, genericName: null, laboratory: null, aliases });

test("bestMatches: la mejor entre la etiqueta y cada alias; los alias extra no diluyen", () => {
  const withAlias = cat("1", "ONDAPRIM 8MG AMP", ["Ondansetron"]);
  const [m] = bestMatches("Ondansetron 8 mg", [withAlias]);
  assert.equal(m.via, "Ondansetron");
  // Añadir alias que no ayudan no empeora la puntuación del producto.
  const noisy = cat("1", "ONDAPRIM 8MG AMP", ["Ondansetron", "uno dos tres cuatro cinco seis"]);
  assert.equal(bestMatches("Ondansetron 8 mg", [noisy])[0].score, m.score);
  // Sin alias, el comportamiento anterior no cambia.
  assert.equal(bestMatches("Ondaprim 8 mg", [cat("1", "ONDAPRIM 8MG AMP")])[0].via, undefined);
});

test("autoMatch con alias: la concentración se comprueba contra etiqueta + alias", () => {
  const catalog = [cat("1", "ONDAPRIM 8MG AMP", ["Ondansetron"]), cat("2", "PARACETAMOL 500 MG")];
  assert.equal(autoMatch("Ondansetron 8 mg", catalog)?.product.id, "1");
  assert.equal(autoMatch("Ondansetron 4 mg", catalog), null); // otra concentración: no se sugiere sola
});

test("searchByTerm: también encuentra por alias", () => {
  const found = searchByTerm("zofran", [cat("1", "ONDAPRIM 8MG AMP", ["Zofran"]), cat("2", "PARACETAMOL")]);
  assert.deepEqual(found.map((c) => c.id), ["1"]);
});

const base = { commercialName: "Ondaprim 8 mg", salePrice: 100, minStock: 0 };

test("createProductSchema: alias limpios, y rechaza repetidos, iguales al nombre o demasiados", () => {
  const ok = createProductSchema.parse({ ...base, aliases: ["  Ondansetrón  ", "Zofran"] });
  assert.deepEqual(ok.aliases, ["Ondansetrón", "Zofran"]);
  assert.deepEqual(createProductSchema.parse(base).aliases, undefined);
  assert.ok(!createProductSchema.safeParse({ ...base, aliases: ["Ondansetrón", "ONDANSETRON"] }).success);
  assert.ok(!createProductSchema.safeParse({ ...base, aliases: ["ondaprim 8 MG"] }).success);
  assert.ok(!createProductSchema.safeParse({ ...base, aliases: ["x"] }).success);
  assert.ok(!createProductSchema.safeParse({ ...base, aliases: Array.from({ length: 11 }, (_, i) => `alias ${i}`) }).success);
});

test("updateProductSchema: alias sin nombre pasa (el servicio compara con el actual) y con nombre repetido falla", () => {
  assert.ok(updateProductSchema.safeParse({ aliases: ["Zofran"] }).success);
  assert.ok(!updateProductSchema.safeParse({ commercialName: "Zofran", aliases: ["zofran"] }).success);
});
