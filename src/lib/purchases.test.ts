import assert from "node:assert/strict";
import { test } from "node:test";
import { findDuplicateLot, nameKey, productKey, purchaseTotal } from "./purchases";

test("total = suma de precio de compra por cantidad", () => {
  assert.equal(
    purchaseTotal([
      { purchasePrice: 150, quantity: 20 },
      { purchasePrice: 400, quantity: 3 },
    ]),
    4200,
  );
  assert.equal(purchaseTotal([]), 0);
});

test("nameKey normaliza mayúsculas y espacios", () => {
  assert.equal(nameKey("  Paracetamol   500MG "), "paracetamol 500mg");
});

test("productKey: id si existe, nombre normalizado si es nuevo", () => {
  assert.equal(productKey({ productId: "abc" }), "abc");
  assert.equal(productKey({ newProduct: { commercialName: " Nuevo  X " } }), "new:nuevo x");
});

test("lote repetido solo cuenta para el mismo producto", () => {
  assert.equal(
    findDuplicateLot([
      { productKey: "p1", lotNumber: "L-1" },
      { productKey: "p2", lotNumber: "L-1" },
    ]),
    null,
  );
  assert.equal(
    findDuplicateLot([
      { productKey: "p1", lotNumber: "L-1" },
      { productKey: "p1", lotNumber: " l-1 " },
    ]),
    "l-1",
  );
});

test("un producto nuevo repetido por nombre comparte clave, así sus lotes también se comparan", () => {
  const a = productKey({ newProduct: { commercialName: "Jarabe X" } });
  const b = productKey({ newProduct: { commercialName: "jarabe  x" } });
  assert.equal(a, b);
  assert.equal(
    findDuplicateLot([
      { productKey: a, lotNumber: "A" },
      { productKey: b, lotNumber: "B" },
    ]),
    null,
  );
});
