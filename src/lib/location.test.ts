import assert from "node:assert/strict";
import { test } from "node:test";
import { createProductSchema, listProductsQuerySchema } from "@/modules/products/schemas";
import { formatLocation, isLocationPart } from "./location";

test("formatLocation: ambas partes, una sola y ninguna", () => {
  assert.equal(formatLocation("3", "2"), "Estante 3 · Fila 2");
  assert.equal(formatLocation("3", null), "Estante 3");
  assert.equal(formatLocation(null, "2"), "Fila 2");
  assert.equal(formatLocation("  ", ""), null);
  assert.equal(formatLocation(undefined, undefined), null);
  assert.equal(formatLocation(" A ", " 3B "), "Estante A · Fila 3B");
});

test("isLocationPart: largo máximo y caracteres de control", () => {
  assert.ok(isLocationPart("3B"));
  assert.ok(isLocationPart("x".repeat(20)));
  assert.ok(!isLocationPart("x".repeat(21)));
  assert.ok(!isLocationPart("3\n"));
  assert.ok(!isLocationPart("3\u0000"));
});

const base = { commercialName: "Prod", salePrice: 100, minStock: 0 };

test("createProductSchema: ubicación vacía se guarda como null y se rechaza lo inválido", () => {
  const ok = createProductSchema.parse({ ...base, shelf: "  3 ", shelfRow: "" });
  assert.equal(ok.shelf, "3");
  assert.equal(ok.shelfRow, null);
  assert.ok(!createProductSchema.safeParse({ ...base, shelf: "x".repeat(21) }).success);
  assert.ok(!createProductSchema.safeParse({ ...base, shelfRow: "2\n3" }).success);
});

test("listProductsQuerySchema: names se parte por comas con límites", () => {
  assert.deepEqual(listProductsQuerySchema.parse({ names: "a, b ,,c" }).names, ["a", "b", "c"]);
  assert.equal(listProductsQuerySchema.parse({}).names, undefined);
  assert.ok(!listProductsQuerySchema.safeParse({ names: Array.from({ length: 31 }, (_, i) => `n${i}`).join(",") }).success);
  assert.ok(!listProductsQuerySchema.safeParse({ names: "x".repeat(61) }).success);
});
