import assert from "node:assert/strict";
import { test } from "node:test";
import { availableOf, validateReturn, type ReturnLine } from "./returns";

const lines: ReturnLine[] = [
  { saleItemId: "L1", productName: "Paracetamol", quantity: 3, returned: 0, unitPrice: 250 },
  { saleItemId: "L2", productName: "Paracetamol", quantity: 2, returned: 1, unitPrice: 250 },
  { saleItemId: "L3", productName: "Ibuprofeno", quantity: 1, returned: 1, unitPrice: 400 },
];

test("disponible = vendido - ya devuelto", () => {
  assert.equal(availableOf(lines[0]), 3);
  assert.equal(availableOf(lines[1]), 1);
  assert.equal(availableOf(lines[2]), 0);
});

test("devolución válida: reembolso con el precio de la línea", () => {
  const r = validateReturn(lines, [{ saleItemId: "L1", quantity: 2, condition: "GOOD" }]);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.refunded, 500);
});

test("cada línea (producto + lote) tiene su propio tope", () => {
  const r = validateReturn(lines, [
    { saleItemId: "L1", quantity: 3, condition: "GOOD" },
    { saleItemId: "L2", quantity: 1, condition: "DAMAGED" },
  ]);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.refunded, 1000);
  const over = validateReturn(lines, [{ saleItemId: "L2", quantity: 2, condition: "GOOD" }]);
  assert.equal(over.ok, false);
  if (!over.ok) assert.match(over.error, /Solo puedes devolver 1 unidad\(es\) de Paracetamol — ya se devolvieron 1/);
});

test("una línea ya devuelta por completo se rechaza", () => {
  const r = validateReturn(lines, [{ saleItemId: "L3", quantity: 1, condition: "GOOD" }]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /Ya se devolvió la totalidad de Ibuprofeno/);
});

test("una línea ajena a la venta se rechaza", () => {
  const r = validateReturn(lines, [{ saleItemId: "X", quantity: 1, condition: "GOOD" }]);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.kind, "not_in_sale");
});

test("las entradas repetidas se suman y el tope cuenta el total", () => {
  const okSum = validateReturn(lines, [
    { saleItemId: "L1", quantity: 1, condition: "GOOD" },
    { saleItemId: "L1", quantity: 2, condition: "GOOD" },
  ]);
  assert.equal(okSum.ok, true);
  if (okSum.ok) {
    assert.equal(okSum.items.length, 1);
    assert.equal(okSum.items[0].quantity, 3);
  }
  // mismo tope aunque se reparta entre estados distintos
  const over = validateReturn(lines, [
    { saleItemId: "L1", quantity: 2, condition: "GOOD" },
    { saleItemId: "L1", quantity: 2, condition: "DAMAGED" },
  ]);
  assert.equal(over.ok, false);
});
