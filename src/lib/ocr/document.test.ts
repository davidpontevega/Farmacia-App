import assert from "node:assert/strict";
import { test } from "node:test";
import { isShippingLine, readDocumentInfo } from "./document";

// Líneas reales que el OCR leyó de la cotización de HealTec (modo de página única).
const COTIZACION = [
  "ciuda pur COTIZACIÓN",
  "celdares : 954717535",
  "Heal lec o N* CO06260195",
  "drugstore 991364366 HEALTEC S.A.C.",
  "RUC: 20543463362 a",
  "Contan_ jr wa ss FECHA : viemes, 12 Junio, 2026",
  "CODIGO : 2905210006 RUC: 10705530942 VALIDEZ DE OFERTA : 1 Dias",
  "ITEM CODIGO CANT UM DESCRIPCION DE ARTICULO Expiración PRECIO S/. TOTAL S",
  "TOTAL REGISTROS : 16 SON: NOVECIENTOS VEINTE Y NUEVE Y 50/100 SOLES (S.E.U.O) (PRECIOS INCLUYEN 1GV",
  "LOS ARTICULOS CUENTAN CON SU RESPECTIVO DESCUENTC SUB TOTAL (S/.) 787.71",
  "TOTAL IMPORTE (S/.) 929.50",
].join("\n");

test("cotización real: fecha, subtotal, total y cantidad de filas; el número aparece como «N*»; sin IGV", () => {
  assert.deepEqual(readDocumentInfo(COTIZACION), {
    supplierName: "HEALTEC SAC",
    documentNumber: "CO06260195",
    documentDate: "2026-06-12",
    subtotalCents: 78771,
    igvCents: null,
    totalCents: 92950,
    rowCount: 16,
  });
});

test("el IGV y el número se leen cuando están", () => {
  const info = readDocumentInfo("COTIZACIÓN\nN° CO06260195\nSUB TOTAL (S/.) 787.71\nI.G.V. (S/.) 141.79\nTOTAL IMPORTE (S/.) 929.50");
  assert.equal(info.documentNumber, "CO06260195");
  assert.equal(info.igvCents, 14179);
  assert.equal(info.totalCents, 92950);
});

test("factura: número con guion y totales con separador de miles", () => {
  const info = readDocumentInfo("FACTURA ELECTRÓNICA\nN° F002-00001390\nFECHA : 21/09/2026\nTOTAL IMPORTE S/ 1,863.50");
  assert.equal(info.documentNumber, "F002-00001390");
  assert.equal(info.documentDate, "2026-09-21");
  assert.equal(info.totalCents, 186350);
});

test("fecha con 'de' y mes abreviado", () => {
  assert.equal(readDocumentInfo("Fecha: 5 de setiembre de 2026").documentDate, "2026-09-05");
  assert.equal(readDocumentInfo("FECHA 3 Dic 2026").documentDate, "2026-12-03");
});

test("sin datos reconocibles: todo null", () => {
  assert.deepEqual(readDocumentInfo("texto cualquiera sin datos"), {
    supplierName: null,
    documentNumber: null,
    documentDate: null,
    subtotalCents: null,
    igvCents: null,
    totalCents: null,
    rowCount: null,
  });
});

test("una fecha imposible no se acepta", () => {
  assert.equal(readDocumentInfo("FECHA : 45 Junio, 2026").documentDate, null);
  assert.equal(readDocumentInfo("FECHA : 12 Foo, 2026").documentDate, null);
});

test("razón social con otros sufijos y sin ruido de dígitos delante", () => {
  assert.equal(readDocumentInfo("tel 987654321 DROGUERIA SALUD S.R.L.").supplierName, "DROGUERIA SALUD SRL");
  assert.equal(readDocumentInfo("sin razon social").supplierName, null);
});

test("líneas de envío no son productos", () => {
  for (const d of ["GASTOS DE ENVIO", "Gastos de envío", "FLETE", "ENVIO A DOMICILIO", "TRANSPORTE"]) assert.ok(isShippingLine(d), d);
  for (const d of ["ENVIROSOL 100ML", "FLETRIN GEL", "CEFTRIAXONA 1GR"]) assert.ok(!isShippingLine(d), d);
});
