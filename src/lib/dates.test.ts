import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, formatDate, isRealDate, todayLima } from "./dates";

test("addDays cruza meses y años", () => {
  assert.equal(addDays("2026-12-25", 10), "2027-01-04");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("isRealDate rechaza fechas inexistentes o mal formadas", () => {
  assert.equal(isRealDate("2027-06-30"), true);
  assert.equal(isRealDate("2027-02-30"), false);
  assert.equal(isRealDate("30/06/2027"), false);
});

test("todayLima usa la fecha de Lima, no la UTC", () => {
  // 02:00 UTC del día 2 todavía es el día 1 a las 21:00 en Lima (UTC-5)
  assert.equal(todayLima(new Date("2027-03-02T02:00:00Z")), "2027-03-01");
});

test("formatDate", () => {
  assert.equal(formatDate("2027-06-30"), "30/06/2027");
});
