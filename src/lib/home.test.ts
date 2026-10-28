import assert from "node:assert/strict";
import { test } from "node:test";
import { alertCounts, averageTicket, counterPlan, hourlySeries, pointsDelta, yapeSharePct } from "./home";
import { filterNav, groupNav, NAV_ITEMS, pageMeta } from "./nav";

test("hourlySeries: de 8 a 19 h por defecto, con ceros donde no hubo ventas", () => {
  const s = hourlySeries([{ hour: 10, total: 500 }], [{ hour: 10, total: 300 }, { hour: 15, total: 100 }]);
  assert.equal(s.length, 12);
  assert.deepEqual([s[0].hour, s[s.length - 1].hour], [8, 19]);
  const ten = s.find((p) => p.hour === 10)!;
  assert.deepEqual([ten.todayCents, ten.yesterdayCents, ten.label], [500, 300, "10 h"]);
  assert.deepEqual([s.find((p) => p.hour === 9)!.todayCents, s.find((p) => p.hour === 15)!.todayCents], [0, 0]);
});

test("hourlySeries: se amplía con ventas fuera del horario y suma filas de la misma hora", () => {
  const s = hourlySeries([{ hour: 6, total: 200 }, { hour: 21, total: 100 }, { hour: 21, total: 50 }], []);
  assert.deepEqual([s[0].hour, s[s.length - 1].hour], [6, 21]);
  assert.equal(s.find((p) => p.hour === 21)!.todayCents, 150);
  assert.equal(s.find((p) => p.hour === 6)!.todayCents, 200);
});

test("ticket promedio, parte de Yape y puntos", () => {
  assert.equal(averageTicket(10000, 4), 2500);
  assert.equal(averageTicket(0, 0), 0);
  assert.equal(yapeSharePct(3400, 10000), 34);
  assert.equal(yapeSharePct(0, 0), 0);
  assert.equal(pointsDelta(34, 36), -2);
});

test("alertCounts: vencidos cuentan como por vencer; sin stock aparte del stock bajo", () => {
  const c = alertCounts({ expired: [1], expiringSoon: [1, 2], lowStock: [{ stock: 0 }, { stock: 3 }, { stock: 1 }] });
  assert.deepEqual(c, { expiring: 3, low: 2, out: 1, total: 6 });
});

test("counterPlan: cada usuario ve solo los contadores de lo que puede leer", () => {
  assert.deepEqual(counterPlan(["sales.create"]), { shortages: false, alerts: false });
  assert.deepEqual(counterPlan(["shortages.read"]), { shortages: true, alerts: false });
  assert.deepEqual(counterPlan(["reports.read", "shortages.read"]), { shortages: true, alerts: true });
});

test("groupNav: solo lo permitido, por sección, sin secciones vacías; Inicio no va en el menú (es el logo)", () => {
  const cashier = groupNav(NAV_ITEMS, ["sales.create", "cash.read", "products.read", "returns.create"]);
  assert.deepEqual(cashier.map((s) => s.title), ["Operación", "Inventario"]);
  assert.deepEqual(cashier[0].items.map((i) => i.label), ["Punto de venta", "Caja", "Consulta", "Devoluciones"]);
  assert.deepEqual(cashier[1].items.map((i) => i.label), ["Productos"]);
  assert.deepEqual(groupNav(NAV_ITEMS, []), []);
  const admin = groupNav(NAV_ITEMS, NAV_ITEMS.flatMap((i) => (i.permission ? [i.permission] : [])));
  assert.deepEqual(admin.map((s) => s.title), ["Operación", "Inventario", "Análisis", "Administración"]);
  assert.equal(admin.flatMap((s) => s.items).length, NAV_ITEMS.length - 1); // todo menos Inicio
});

test("pageMeta: título por ruta, también en subrutas, y respaldo", () => {
  assert.equal(pageMeta("/inicio").title, "Inicio");
  assert.equal(pageMeta("/inicio").dated, true);
  assert.equal(pageMeta("/admin/shortages").title, "Faltantes");
  assert.equal(pageMeta("/admin/products/123").title, "Productos");
  assert.equal(pageMeta("/pos").dated, false);
  assert.equal(pageMeta("/otra").title, "NicFarma");
  assert.equal(pageMeta("/posible").title, "NicFarma"); // «/pos» no es prefijo de «/posible»
});

test("filterNav: sin tildes ni mayúsculas, todas las palabras, y sin texto devuelve todo", () => {
  assert.equal(filterNav("", NAV_ITEMS).length, NAV_ITEMS.length);
  assert.deepEqual(filterNav("DEVOLUCION", NAV_ITEMS).map((i) => i.label), ["Devoluciones", "Historial de devoluciones"]);
  assert.deepEqual(filterNav("historial dev", NAV_ITEMS).map((i) => i.label), ["Historial de devoluciones"]);
  assert.deepEqual(filterNav("analisis", NAV_ITEMS).map((i) => i.label), ["Ventas", "Reportes", "Historial de devoluciones"]); // por sección
  assert.deepEqual(filterNav("zzz", NAV_ITEMS), []);
});

test("filterNav: Inicio, que no está en el menú, sí se encuentra en el buscador", () => {
  assert.deepEqual(filterNav("inicio", NAV_ITEMS).map((i) => i.href), ["/inicio"]);
});
