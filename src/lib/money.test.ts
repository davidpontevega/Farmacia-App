import assert from "node:assert/strict";
import { test } from "node:test";
import { centsToInput, formatSoles, formatSolesSigned, isValidSoles, toCents } from "./money";

test("toCents convierte soles a centavos sin errores de float", () => {
  assert.equal(toCents("2.50"), 250);
  assert.equal(toCents("2,5"), 250);
  assert.equal(toCents("2"), 200);
  assert.equal(toCents("0.07"), 7);
  assert.equal(toCents("19.99"), 1999);
  assert.equal(toCents(" 1.10 "), 110);
});

test("toCents rechaza formatos inválidos", () => {
  for (const bad of ["", "abc", "-1", "1.234", "1.", ".5", "1,2,3"]) {
    assert.throws(() => toCents(bad), bad);
    assert.equal(isValidSoles(bad), false, bad);
  }
});

test("formatSoles y centsToInput", () => {
  assert.equal(formatSoles(250), "S/ 2.50");
  assert.equal(formatSoles(7), "S/ 0.07");
  assert.equal(formatSoles(0), "S/ 0.00");
  assert.equal(formatSoles(-150), "-S/ 1.50");
  assert.equal(centsToInput(1999), "19.99");
});

test("formatSolesSigned marca el signo de sobrantes y faltantes", () => {
  assert.equal(formatSolesSigned(200), "+S/ 2.00");
  assert.equal(formatSolesSigned(-200), "-S/ 2.00");
  assert.equal(formatSolesSigned(0), "S/ 0.00");
});
