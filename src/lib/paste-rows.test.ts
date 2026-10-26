import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanNumber, parsePastedRows } from "./paste-rows";

test("fila copiada de un PDF (espacios simples, con número de ítem)", () => {
  const [l] = parsePastedRows(
    "1 CLO0047 3 CAJ CLORURO DE SODIO 0.9% (1000ML) SOL. INY. OQCORP X 12 31/12/2028 48.00 144.00",
  );
  assert.deepEqual(l.row, {
    code: "CLO0047",
    qty: "3",
    um: "CAJ",
    description: "CLORURO DE SODIO 0.9% (1000ML) SOL. INY. OQCORP X 12",
    expiry: "31/12/2028",
    price: "48.00",
    total: "144.00",
  });
});

test("fila sin vencimiento (como el envío o un producto sin fecha)", () => {
  const [l] = parsePastedRows("16 GAS0004 1 UND GASTOS DE ENVIO 10.00 10.00");
  assert.equal(l.row?.expiry, "");
  assert.equal(l.row?.description, "GASTOS DE ENVIO");
  assert.equal(l.row?.price, "10.00");
});

test("columnas separadas por tabulación", () => {
  const [l] = parsePastedRows("KET0001\t2\tCAJ\tKETOPAN 100MG (5ML) SOL. INY. X 25\t30/10/2028\t62.50\t125.00");
  assert.equal(l.row?.code, "KET0001");
  assert.equal(l.row?.qty, "2");
  assert.equal(l.row?.um, "CAJ");
  assert.equal(l.row?.expiry, "30/10/2028");
  assert.equal(l.row?.price, "62.50");
  assert.equal(l.row?.total, "125.00");
});

test("columnas separadas por ; y con vencimiento mes/año", () => {
  const [l] = parsePastedRows("DIC0002;5;CAJ;DICLOFENACO GEL 1% (50GR) PORTUGAL X 1;11/2029;3,50;17,50");
  assert.equal(l.row?.expiry, "11/2029");
  assert.equal(l.row?.price, "3.50");
  assert.equal(l.row?.total, "17.50");
});

test("un renglón que no se entiende queda sin fila para marcarlo", () => {
  const lines = parsePastedRows("esto no es una fila\n\n1 CLO0047 3 CAJ CLORURO 31/12/2028 48.00 144.00");
  assert.equal(lines.length, 2);
  assert.equal(lines[0].row, null);
  assert.notEqual(lines[1].row, null);
});

test("cleanNumber: miles y coma decimal", () => {
  assert.equal(cleanNumber("1,863.50"), "1863.50");
  assert.equal(cleanNumber("1,80"), "1.80");
  assert.equal(cleanNumber("48.00"), "48.00");
});

// Las 16 líneas de la cotización de HealTec, tal como salen al copiarlas.
const COTIZACION = [
  "1 CLO0047 3 CAJ CLORURO DE SODIO 0.9% (1000ML) SOL. INY. OQCORP X 12 31/12/2028 48.00 144.00",
  "2 CLO0048 5 UND CLORURO DE SODIO 0.9% (100ML) PHARMAGEN X1 30/06/2028 1.80 9.00",
  "3 KET0001 2 CAJ KETOPAN 100MG (5ML) SOL. INY. (KETOPROFENO) OTARVASQ X 25 30/10/2028 62.50 125.00",
  "4 DIC0002 5 CAJ DICLOFENACO GEL 1% (50GR) PORTUGAL X 1 30/11/2029 3.50 17.50",
  "5 SON0013 4 SOB SONDA NASO-GASTRICA (8) MEDEX X 01 30/09/2030 2.00 8.00",
  "6 CIP0001 15 CAJ CIPRONOR (CIPROFLOXACINO) INY. (200/100ML) NORDIC X 01 2.50 37.50",
  "7 BET0004 1 CAJ BETAMETASONA 4MG/ML SOL. INY. (1ML) DANY X 25 30/10/2027 78.00 78.00",
  "8 DOL0014 5 CAJ DOLOL FRUTAS (PARACETAMOL GOTAS 100MG/ML) 15ML IQFARMA 01/11/2027 2.30 11.50",
  "9 AZI0005 2 FCO AZITROMICINA JARABE 200MG/5ML (15ML) PORTUGAL X 01 30/09/2028 5.50 11.00",
  "10 IBU0009 4 CAJ IBUPROFENO (100MG/5ML) 120ML SUSP. ORAL IQFARMA X 1 28/02/2027 4.50 18.00",
  "11 ORF0007 1 CAJ ORFENADRINA (ORFEDOL) 60MG/2ML SOL. INYEC. CORVAL X 25 30/09/2027 28.00 28.00",
  "12 CEF0003 2 CAJ CEFTRIAXONA (1GR) POLVO PARA SOL. INY. DANY X 10 31/08/2027 13.00 26.00",
  "13 DEQ0001 2 CAJ DEQUAZOL-R NF 500MG+100 000UI X 8 OVULOS MEDIFARMA 31/03/2027 63.00 126.00",
  "14 PEN0001 7 UND PENCAN AGUJA ESPINAL (27G*3 1/2) BRAUN X 01 01/09/2029 32.50 227.50",
  "15 BOL0006 1 PAQ BOLSA COLECTORA DE SANGRE SIMPLE (450ML) TIANHE X 05 31/07/2028 52.50 52.50",
  "16 GAS0004 1 UND GASTOS DE ENVIO 10.00 10.00",
];

test("la cotización completa de HealTec se lee fila por fila", () => {
  const lines = parsePastedRows(COTIZACION.join("\n"));
  assert.equal(lines.length, 16);
  assert.equal(lines.filter((l) => l.row).length, 16);

  const rows = lines.map((l) => l.row!);
  // cantidad x precio = total en todas las filas, y la suma es el subtotal con IGV del documento
  let sum = 0;
  for (const r of rows) {
    const total = Number(r.total);
    assert.equal(Math.round(Number(r.qty) * Number(r.price) * 100), Math.round(total * 100), r.description);
    sum += total;
  }
  assert.equal(Math.round(sum * 100), 92950);
  // la fila sin vencimiento y el envío salen con el vencimiento vacío
  assert.equal(rows[5].expiry, "");
  assert.equal(rows[15].expiry, "");
  assert.equal(rows[12].description, "DEQUAZOL-R NF 500MG+100 000UI X 8 OVULOS MEDIFARMA");
  assert.equal(rows[13].expiry, "01/09/2029");
});

test("vencimiento mes/aa (05/27) también se reconoce", () => {
  const [l] = parsePastedRows("KET0001 2 CAJ KETOPAN 100MG X 25 05/27 62.50 125.00");
  assert.equal(l.row?.expiry, "05/27");
  assert.equal(l.row?.price, "62.50");
});
