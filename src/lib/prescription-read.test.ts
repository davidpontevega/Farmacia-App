import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cropError,
  isUncertainLine,
  parseReadLines,
  READ_LIMIT,
  READ_MAX_LINES,
  readLimitReached,
  readWindowStart,
} from "./prescription-read";

test("cropError: sin recorte, fuera de la foto, muy pequeño, muy grande y válido", () => {
  assert.ok(cropError(null));
  assert.ok(cropError({ x: 0.5, y: 0.5, w: 0.6, h: 0.4 })); // se sale
  assert.ok(cropError({ x: 0, y: 0, w: 0.2, h: 0.2 })); // 4 %
  assert.ok(cropError({ x: 0, y: 0, w: 1, h: 1 })); // la foto entera
  assert.ok(cropError({ x: 0, y: 0, w: 0.9, h: 0.9 })); // 81 %
  assert.ok(cropError({ x: Number.NaN, y: 0, w: 0.5, h: 0.5 }));
  assert.ok(cropError({ x: -0.1, y: 0, w: 0.5, h: 0.5 }));
  assert.equal(cropError({ x: 0.1, y: 0.3, w: 0.8, h: 0.5 }), null); // 40 %
  assert.equal(cropError({ x: 0, y: 0, w: 0.7, h: 1 }), null); // justo 70 %
});

test("parseReadLines: JSON limpio y con texto alrededor", () => {
  assert.deepEqual(parseReadLines('{"lines":["Amoxicilina 500 mg x 21"," Paracetamol  500 "]}'), ["Amoxicilina 500 mg x 21", "Paracetamol 500"]);
  assert.deepEqual(parseReadLines('Aquí va:\n```json\n{"lines":["Loratadina 10 mg"]}\n```'), ["Loratadina 10 mg"]);
});

test("parseReadLines: respuestas inválidas devuelven null", () => {
  assert.equal(parseReadLines("no es json"), null);
  assert.equal(parseReadLines('{"otra":1}'), null);
  assert.equal(parseReadLines('{"lines":"texto"}'), null);
  assert.equal(parseReadLines(""), null);
});

test("parseReadLines: descarta vacías, largas, con control y no-texto; tope de 30", () => {
  const long = "x".repeat(121);
  assert.deepEqual(parseReadLines(JSON.stringify({ lines: ["", "  ", long, "ok\u0000", 5, null, "Bueno"] })), ["Bueno"]);
  const many = Array.from({ length: 40 }, (_, i) => `med${i}`);
  assert.equal(parseReadLines(JSON.stringify({ lines: many }))?.length, READ_MAX_LINES);
});

test("isUncertainLine: marca las que traen «?»", () => {
  assert.ok(isUncertainLine("Amox? 500 mg"));
  assert.ok(!isUncertainLine("Amoxicilina 500 mg"));
});

test("límite de uso: ventana de 10 min y tope de 15", () => {
  const now = new Date("2026-10-27T12:00:00Z");
  assert.equal(readWindowStart(now).toISOString(), "2026-10-27T11:50:00.000Z");
  assert.ok(!readLimitReached(READ_LIMIT - 1));
  assert.ok(readLimitReached(READ_LIMIT));
});
