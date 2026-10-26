import assert from "node:assert/strict";
import { test } from "node:test";
import { assignToRows, findHeader, rowCenters, rowPitch, type OcrWord } from "./layout";

const w = (text: string, x0: number, x1: number, y0 = 280, y1 = 290): OcrWord => ({
  text,
  confidence: 90,
  bbox: { x0, y0, x1, y1 },
});

// Encabezado real de la cotización de HealTec, leído por el OCR (píxeles de la imagen original).
const HEADER_LINE = [
  w("ITEM", 42, 65),
  w("CODIGO", 70, 106),
  w("CANT", 123, 147),
  w("UM", 158, 172),
  w("DESCRIPCION", 183, 245),
  w("DE", 248, 259),
  w("ARTICULO", 262, 310),
  w("Expiración", 575, 617),
  w("PRECIO", 653, 687),
  w("S/.", 690, 703),
  w("TOTAL", 730, 759),
  w("S", 762, 768),
];
// Texto de más arriba que también contiene rótulos sueltos ("CODIGO : 2405210006").
const DECOY = [w("CODIGO", 45, 80, 210, 220), w(":", 90, 95, 210, 220), w("2405210006", 100, 160, 210, 220), w("RUC", 200, 220, 210, 220)];

test("encuentra el encabezado real y calcula las 8 columnas", () => {
  const h = findHeader([...DECOY, ...HEADER_LINE]);
  assert.ok(h);
  assert.deepEqual(Object.keys(h.columns).sort(), ["code", "date", "desc", "item", "price", "qty", "total", "um"]);
  // Extensión horizontal de los DATOS de cada columna en la imagen real (medida a mano). Cada borde
  // calculado debe caer en el hueco entre los datos de dos columnas vecinas: así ninguna lectura
  // se corta ni se mezcla con la vecina.
  const data = {
    item: [45, 62],
    code: [70, 112],
    qty: [140, 152],
    um: [155, 175],
    desc: [183, 565],
    date: [575, 632],
    price: [660, 692],
    total: [740, 778],
  } as const;
  const order = ["item", "code", "qty", "um", "desc", "date", "price", "total"] as const;
  assert.ok(h.columns.item![0] <= data.item[0], "el borde izquierdo no corta el primer dato");
  assert.ok(h.columns.total![1] >= data.total[1], "el borde derecho no corta el último dato");
  for (let i = 1; i < order.length; i++) {
    const edge = h.columns[order[i]]![0];
    assert.ok(
      edge >= data[order[i - 1]][1] && edge <= data[order[i]][0],
      `borde ${order[i - 1]}/${order[i]} = ${edge} debe estar entre ${data[order[i - 1]][1]} y ${data[order[i]][0]}`,
    );
  }
  assert.equal(h.bottom, 290);
});

test("las columnas son contiguas y crecientes", () => {
  const h = findHeader(HEADER_LINE)!;
  const order = ["item", "code", "qty", "um", "desc", "date", "price", "total"] as const;
  for (let i = 1; i < order.length; i++) {
    assert.equal(h.columns[order[i]]![0], h.columns[order[i - 1]]![1]);
    assert.ok(h.columns[order[i]]![0] < h.columns[order[i]]![1]);
  }
});

test("sin ITEM ni UM sigue sirviendo si están cantidad, precio y total", () => {
  const h = findHeader([w("CANT", 10, 40), w("DESCRIPCION", 60, 150), w("PRECIO", 300, 340), w("TOTAL", 360, 400)]);
  assert.ok(h);
  assert.deepEqual(Object.keys(h.columns).sort(), ["desc", "price", "qty", "total"]);
});

test("sin encabezado reconocible devuelve null", () => {
  assert.equal(findHeader([w("hola", 0, 30), w("mundo", 40, 80)]), null);
  assert.equal(findHeader([w("CANT", 10, 40), w("DESCRIPCION", 60, 150)]), null);
});

test("rowCenters interpola las filas cuyo número no se leyó", () => {
  const truth = (n: number) => 300 + 16.4 * (n - 1);
  const anchors = [1, 2, 4, 5, 6, 7, 9, 10, 12, 13, 14, 15, 16].map((n) => ({ n, y: truth(n) }));
  const centers = rowCenters(anchors, 16)!;
  assert.equal(centers.length, 16);
  for (let n = 1; n <= 16; n++) assert.ok(Math.abs(centers[n - 1] - truth(n)) < 0.01, `fila ${n}`);
  assert.ok(Math.abs(rowPitch(centers) - 16.4) < 0.01);
});

test("rowCenters extrapola al principio y al final", () => {
  const truth = (n: number) => 100 + 20 * (n - 1);
  const centers = rowCenters([3, 4, 5].map((n) => ({ n, y: truth(n) })), 8)!;
  assert.ok(Math.abs(centers[0] - 100) < 0.01);
  assert.ok(Math.abs(centers[7] - 240) < 0.01);
});

test("rowCenters rechaza anclas insuficientes o desordenadas", () => {
  assert.equal(rowCenters([{ n: 1, y: 10 }], 5), null);
  assert.equal(rowCenters([{ n: 1, y: 100 }, { n: 2, y: 50 }], 5), null);
  // un número repetido o fuera de rango se ignora
  assert.ok(rowCenters([{ n: 1, y: 10 }, { n: 1, y: 11 }, { n: 2, y: 30 }, { n: 99, y: 500 }], 3));
});

test("assignToRows reparte por cercanía y descarta lo que cae fuera (pie de página)", () => {
  const centers = [100, 120, 140];
  const rows = assignToRows(
    [
      { y: 101, t: "a" },
      { y: 119, t: "b" },
      { y: 122, t: "b2" },
      { y: 139, t: "c" },
      { y: 200, t: "pie" },
      { y: 10, t: "encabezado" },
    ],
    centers,
  );
  assert.deepEqual(rows.map((r) => r.map((x) => x.t)), [["a"], ["b", "b2"], ["c"]]);
});
