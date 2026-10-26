import assert from "node:assert/strict";
import { test } from "node:test";
import {
  autoLotNumber,
  documentBalance,
  isFarExpiry,
  parseExpiry,
  roundingDiff,
  suggestSalePrice,
  suggestUnitsPerPackage,
  unitCost,
} from "./purchase-rules";

test("parseExpiry: fecha completa y mes/año (último día del mes)", () => {
  assert.equal(parseExpiry("30/10/2028"), "2028-10-30");
  assert.equal(parseExpiry("06/27"), "2027-06-30");
  assert.equal(parseExpiry("6/2027"), "2027-06-30");
  assert.equal(parseExpiry("02/2028"), "2028-02-29");
  assert.equal(parseExpiry("02/2027"), "2027-02-28");
  assert.equal(parseExpiry("2027-06-30"), "2027-06-30");
});

test("parseExpiry: separadores y confusión O/0 del OCR", () => {
  assert.equal(parseExpiry("30-09-2030"), "2030-09-30");
  assert.equal(parseExpiry("30/O9/2O28"), "2028-09-30");
});

test("parseExpiry rechaza lo que no es una fecha", () => {
  for (const bad of ["", "abc", "31/04/2027", "13/2027", "00/2027", "30/10/28/1", "30/10/202", "12/1999", "2027-02-30"]) {
    assert.equal(parseExpiry(bad), null, bad);
  }
});

test("unidades sugeridas desde la descripción solo para CAJ y PAQ", () => {
  assert.equal(suggestUnitsPerPackage("KETOPAN 100MG SOL. INY. OTARVASQ X 25", "CAJ"), 25);
  assert.equal(suggestUnitsPerPackage("CLORURO DE SODIO 0.9% (1000ML) OQCORP X 12", "CAJ"), 12);
  assert.equal(suggestUnitsPerPackage("BOLSA COLECTORA (450ML) TIANHE X 05", "PAQ"), 5);
  assert.equal(suggestUnitsPerPackage("DEQUAZOL-R NF 500MG+100 000UI X 8 OVULOS MEDIFARMA", "CAJ"), 8);
  assert.equal(suggestUnitsPerPackage("SONDA NASO-GASTRICA (8) MEDEX X 01", "CAJ"), 1);
  assert.equal(suggestUnitsPerPackage("DOLOL FRUTAS (PARACETAMOL GOTAS) 15ML IQFARMA", "CAJ"), 1);
  assert.equal(suggestUnitsPerPackage("AZITROMICINA JARABE X 25", "FCO"), 1);
  assert.equal(suggestUnitsPerPackage("LOPERAMIDA TAB. (2MG) PORTUGAL X 100", "caj"), 100);
  assert.equal(suggestUnitsPerPackage("ALGO X 0", "CAJ"), 1);
});

test("costo por unidad y diferencia de redondeo", () => {
  assert.equal(unitCost(6250, 25), 250); // 2 CAJ X 25 a 62.50 -> 2.50 por unidad
  assert.equal(2 * 25 * unitCost(6250, 25), 12500);
  assert.equal(unitCost(6300, 8), 788); // 7.875 -> 7.88
  assert.equal(roundingDiff(12600, 16, 788), 8); // 16 x 7.88 = 126.08 vs 126.00
  assert.equal(roundingDiff(12500, 50, 250), 0);
});

test("lote automático AAAAMM con sufijo si ya existe", () => {
  assert.equal(autoLotNumber("2028-12-31", new Set()), "202812");
  assert.equal(autoLotNumber("2028-12-31", new Set(["202812"])), "202812-2");
  assert.equal(autoLotNumber("2028-12-31", new Set(["202812", "202812-2"])), "202812-3");
  assert.equal(autoLotNumber("2028-12-31", new Set(["202811"])), "202812");
});

test("precio de venta sugerido: margen y redondeo hacia arriba a 10 céntimos", () => {
  assert.equal(suggestSalePrice(250, 30), 330); // 3.25 -> 3.30
  assert.equal(suggestSalePrice(400, 25), 500); // exacto
  assert.equal(suggestSalePrice(120, 0), 120);
  assert.equal(suggestSalePrice(333, 50), 500); // 4.995 -> 5.00
});

test("cuadre con el total del documento", () => {
  assert.deepEqual(documentBalance({ linesTotalCents: 91950, otherChargesCents: 1000, documentTotalCents: 92950 }), {
    expected: 92950,
    diff: 0,
  });
  assert.equal(documentBalance({ linesTotalCents: 100, otherChargesCents: 0, documentTotalCents: 150 }).diff, 50);
  assert.equal(documentBalance({ linesTotalCents: 100, otherChargesCents: 0, documentTotalCents: null }).diff, null);
});

test("vencimiento muy lejano", () => {
  assert.equal(isFarExpiry("2040-01-01", "2026-10-26"), true);
  assert.equal(isFarExpiry("2030-09-30", "2026-10-26"), false);
});
