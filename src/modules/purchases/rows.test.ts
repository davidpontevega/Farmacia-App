import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalogName } from "@/lib/match";
import {
  applyEdit,
  applyLinks,
  buildPayload,
  derive,
  emptyRow,
  isBlankRow,
  rowFromPasted,
  rowIssues,
  rowStatus,
  rowsTotals,
  type PurchaseRow,
} from "./rows";

const TODAY = "2026-10-26";

const row = (patch: Partial<PurchaseRow> = {}): PurchaseRow => ({
  ...emptyRow(),
  productId: "p1",
  productName: "Ketopan",
  productSource: "manual",
  qty: "2",
  um: "CAJ",
  unitsPerPackage: "25",
  packagePrice: "62.50",
  lineTotal: "125.00",
  expiry: "30/10/2028",
  ...patch,
});

test("derive: 2 CAJ X 25 a S/ 62.50 -> 50 unidades a S/ 2.50", () => {
  const d = derive(row());
  assert.equal(d.stockUnits, 50);
  assert.equal(d.unitCostCents, 250);
  assert.equal(d.documentLineCents, 12500);
  assert.equal(d.expiryIso, "2028-10-30");
});

test("una fila completa y coherente no tiene avisos", () => {
  assert.deepEqual(rowIssues(row(), TODAY), { errors: [], warnings: [] });
  assert.equal(rowStatus(row(), TODAY), "ok");
});

test("errores que impiden registrar", () => {
  const e = (patch: Partial<PurchaseRow>) => rowIssues(row(patch), TODAY).errors;
  assert.ok(e({ productId: "" }).some((m) => /Elige un producto/.test(m)));
  assert.ok(e({ qty: "0" }).includes("Cantidad inválida"));
  assert.ok(e({ qty: "1.5" }).includes("Cantidad inválida"));
  assert.ok(e({ unitsPerPackage: "0" }).includes("Unidades por presentación inválidas"));
  assert.ok(e({ packagePrice: "abc" }).includes("Precio inválido"));
  assert.ok(e({ expiry: "" }).includes("Falta el vencimiento"));
  assert.ok(e({ expiry: "31/02/2028" }).includes("Vencimiento inválido"));
  assert.ok(e({ expiry: "01/2020" }).includes("El vencimiento ya pasó"));
  assert.ok(e({ qty: "100000", unitsPerPackage: "100" }).includes("Demasiadas unidades"));
});

test("producto nuevo exige nombre y precio de venta", () => {
  const nuevo = row({ productId: "", isNew: true, description: "SONDA NASO-GASTRICA (8)", salePrice: "" });
  assert.ok(rowIssues(nuevo, TODAY).errors.some((m) => /precio de venta/.test(m)));
  assert.deepEqual(rowIssues({ ...nuevo, salePrice: "3.50" }, TODAY).errors, []);
  assert.ok(rowIssues({ ...nuevo, description: " ", salePrice: "3.50" }, TODAY).errors.some((m) => /nombre/.test(m)));
});

test("avisos: total que no cuadra, sugerencia sin confirmar, vencimiento lejano, venta bajo el costo", () => {
  const w = (patch: Partial<PurchaseRow>) => rowIssues(row(patch), TODAY).warnings;
  assert.ok(w({ lineTotal: "130.00" }).some((m) => /no coincide con el total/.test(m)));
  assert.ok(w({ productSource: "suggested" }).some((m) => /sugerido/.test(m)));
  assert.ok(w({ expiry: "01/2040" }).some((m) => /muy lejano/.test(m)));
  assert.ok(w({ salePrice: "1.00" }).some((m) => /menor que el costo/.test(m)));
});

test("un aviso confirmado deja la fila lista; un error nunca se confirma", () => {
  const suggested = row({ productSource: "suggested" });
  assert.equal(rowStatus(suggested, TODAY), "warning");
  assert.equal(rowStatus({ ...suggested, confirmed: true }, TODAY), "ok");
  assert.equal(rowStatus(row({ qty: "", confirmed: true }), TODAY), "error");
});

test("vínculos aprendidos eligen el producto y las unidades por el código", () => {
  const links = [{ supplierCode: "KET0001", productId: "p9", productName: "Ketopan 100mg", unitsPerPackage: 25 }];
  const r = applyLinks(row({ productId: "", productName: "", productSource: "", supplierCode: "ket0001", unitsPerPackage: "1" }), links);
  assert.equal(r.productId, "p9");
  assert.equal(r.productSource, "linked");
  assert.equal(r.unitsPerPackage, "25");
  // no pisa un producto ya elegido
  assert.equal(applyLinks(row({ supplierCode: "KET0001" }), links).productId, "p1");
});

test("rowFromPasted: sugiere unidades, vincula por código y propone por descripción", () => {
  const catalog: CatalogName[] = [
    { id: "c1", commercialName: "Cloruro de sodio 0.9% 100ml", genericName: null, laboratory: "Pharmagen" },
  ];
  const r = rowFromPasted(
    { code: "CLO0048", qty: "5", um: "UND", description: "CLORURO DE SODIO 0.9% (100ML) PHARMAGEN X1", expiry: "30/06/2028", price: "1.80", total: "9.00" },
    [],
    catalog,
  );
  assert.equal(r.productId, "c1");
  assert.equal(r.productSource, "suggested");
  assert.equal(r.unitsPerPackage, "1");
  const caja = rowFromPasted(
    { code: "KET0001", qty: "2", um: "CAJ", description: "KETOPAN 100MG X 25", expiry: "", price: "62.50", total: "125.00" },
    [],
    [],
  );
  assert.equal(caja.unitsPerPackage, "25");
  assert.equal(caja.productId, "");
});

test("totales: lo del documento, lo que se guarda y la diferencia de redondeo", () => {
  const rows = [row(), row({ qty: "2", unitsPerPackage: "8", packagePrice: "63.00", lineTotal: "126.00" })];
  const t = rowsTotals(rows);
  assert.equal(t.documentLines, 12500 + 12600);
  assert.equal(t.stored, 12500 + 16 * 788);
  assert.equal(t.rounding, 16 * 788 - 12600);
});

test("buildPayload: cantidades en unidades, costo por unidad y filas vacías omitidas", () => {
  const rows = [
    row({ supplierCode: "KET0001", lot: "  " }),
    row({ productId: "", isNew: true, description: " SONDA ", category: "Otro", salePrice: "3.50", qty: "4", um: "SOB", unitsPerPackage: "1", packagePrice: "2.00", lineTotal: "8.00", expiry: "09/2030" }),
    emptyRow(),
  ];
  assert.equal(isBlankRow(rows[2]), true);
  const payload = buildPayload({ supplier: " HealTec ", documentNumber: "", documentDate: "2026-06-12", otherCharges: "10.00" }, rows);
  assert.equal(payload.supplier, "HealTec");
  assert.equal(payload.documentNumber, undefined);
  assert.equal(payload.documentDate, "2026-06-12");
  assert.equal(payload.otherCharges, 1000);
  assert.equal(payload.items.length, 2);
  assert.deepEqual(payload.items[0], {
    productId: "p1",
    lotNumber: undefined,
    expiryDate: "2028-10-30",
    purchasePrice: 250,
    quantity: 50,
    salePrice: undefined,
    supplierCode: "KET0001",
    unitsPerPackage: 25,
  });
  assert.equal(payload.items[1].newProduct?.commercialName, "SONDA");
  assert.equal(payload.items[1].expiryDate, "2030-09-30");
  assert.equal(payload.items[1].salePrice, 350);
});

test("cambiar el código de una fila vinculada rompe el vínculo y restaura las unidades sugeridas", () => {
  const linked = row({
    supplierCode: "AB12",
    productId: "p9",
    productName: "Otro",
    productSource: "linked",
    description: "KETOPAN X 25",
    um: "CAJ",
    unitsPerPackage: "1",
    unitsEdited: false,
  });
  const edited = applyEdit(linked, { supplierCode: "AB123" });
  assert.equal(edited.productId, "");
  assert.equal(edited.productSource, "");
  assert.equal(edited.unitsPerPackage, "25");
  assert.equal(edited.confirmed, false);
  // unidades escritas por la persona se respetan
  assert.equal(applyEdit({ ...linked, unitsEdited: true, unitsPerPackage: "7" }, { supplierCode: "AB123" }).unitsPerPackage, "7");
  // editar otra cosa no toca el vínculo
  assert.equal(applyEdit(linked, { qty: "3" }).productId, "p9");
  // elegir producto a la vez que se cambia el código lo conserva
  assert.equal(applyEdit(linked, { supplierCode: "ZZ", productId: "p1", productSource: "manual" }).productId, "p1");
});

test("topes del servidor se comprueban en el formulario", () => {
  const e = (patch: Partial<PurchaseRow>) => rowIssues(row(patch), TODAY).errors;
  assert.ok(e({ packagePrice: "1000001.00", unitsPerPackage: "1" }).includes("Precio demasiado alto"));
  assert.ok(e({ salePrice: "1000001.00" }).includes("Precio de venta demasiado alto"));
  assert.ok(e({ unitsPerPackage: "100001", qty: "1" }).includes("Unidades por presentación demasiado altas"));
  assert.deepEqual(e({ packagePrice: "1000000.00", unitsPerPackage: "1" }).filter((m) => /alto/.test(m)), []);
});

test("una fila con solo la marca de producto nuevo o un precio no cuenta como vacía", () => {
  assert.equal(isBlankRow(emptyRow()), true);
  assert.equal(isBlankRow({ ...emptyRow(), isNew: true }), false);
  assert.equal(isBlankRow({ ...emptyRow(), salePrice: "3.50" }), false);
  assert.equal(isBlankRow({ ...emptyRow(), lineTotal: "10.00" }), false);
  assert.equal(isBlankRow({ ...emptyRow(), um: "CAJ" }), false);
});
