// Modelo de una fila del formulario de compra y sus reglas. Sin React: se prueba aparte.
import { isFarExpiry, parseExpiry, suggestUnitsPerPackage, unitCost } from "@/lib/purchase-rules";
import { isValidSoles, toCents } from "@/lib/money";
import { autoMatch, type CatalogName } from "@/lib/match";
import { MAX_SALE_PRICE, MAX_UNIT_COST, MAX_UNITS_PER_PACKAGE } from "@/lib/purchases";
import type { PastedRow } from "@/lib/paste-rows";
import type { CreatePurchaseInput } from "./schemas";
import type { SupplierLink } from "./types";

export type ProductSource = "" | "linked" | "suggested" | "manual";

export type PurchaseRow = {
  key: string;
  supplierCode: string;
  description: string;
  productId: string;
  productName: string;
  /** Cómo se eligió el producto: vínculo aprendido, sugerencia por descripción, o a mano. */
  productSource: ProductSource;
  isNew: boolean;
  category: string;
  qty: string;
  um: string;
  unitsPerPackage: string;
  packagePrice: string;
  lineTotal: string;
  expiry: string;
  lot: string;
  salePrice: string;
  /** La persona revisó los avisos de esta fila. */
  confirmed: boolean;
  /** La persona escribió las unidades por presentación: ya no las pisa un vínculo aprendido. */
  unitsEdited: boolean;
};

let counter = 0;
export const newKey = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

export const emptyRow = (): PurchaseRow => ({
  key: newKey(),
  supplierCode: "",
  description: "",
  productId: "",
  productName: "",
  productSource: "",
  isNew: false,
  category: "",
  qty: "",
  um: "",
  unitsPerPackage: "1",
  packagePrice: "",
  lineTotal: "",
  expiry: "",
  lot: "",
  salePrice: "",
  confirmed: false,
  unitsEdited: false,
});

const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
const soles = (s: string) => (isValidSoles(s) ? toCents(s) : null);

export type Derived = {
  qty: number | null;
  units: number | null;
  /** Unidades que entran al stock: cantidad × unidades por presentación. */
  stockUnits: number | null;
  packagePriceCents: number | null;
  /** Total de la línea según el documento: cantidad × precio de la presentación. */
  documentLineCents: number | null;
  unitCostCents: number | null;
  lineTotalCents: number | null;
  expiryIso: string | null;
  salePriceCents: number | null;
};

export function derive(row: PurchaseRow): Derived {
  const qty = int(row.qty);
  const units = int(row.unitsPerPackage);
  const packagePriceCents = soles(row.packagePrice);
  const validQty = qty !== null && qty >= 1 ? qty : null;
  const validUnits = units !== null && units >= 1 ? units : null;
  return {
    qty: validQty,
    units: validUnits,
    stockUnits: validQty !== null && validUnits !== null ? validQty * validUnits : null,
    packagePriceCents,
    documentLineCents:
      validQty !== null && packagePriceCents !== null ? validQty * packagePriceCents : null,
    unitCostCents:
      packagePriceCents !== null && validUnits !== null ? unitCost(packagePriceCents, validUnits) : null,
    lineTotalCents: row.lineTotal.trim() ? soles(row.lineTotal) : null,
    expiryIso: parseExpiry(row.expiry),
    salePriceCents: row.salePrice.trim() ? soles(row.salePrice) : null,
  };
}

export type RowIssues = { errors: string[]; warnings: string[] };

export function rowIssues(row: PurchaseRow, today: string): RowIssues {
  const d = derive(row);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (row.isNew) {
    if (!row.description.trim()) errors.push("Falta el nombre del producto nuevo");
    if (!(d.salePriceCents && d.salePriceCents > 0)) errors.push("Falta el precio de venta del producto nuevo");
  } else if (!row.productId) {
    errors.push("Elige un producto o créalo como nuevo");
  }
  if (row.salePrice.trim() && d.salePriceCents === null) errors.push("Precio de venta inválido");

  if (d.qty === null) errors.push("Cantidad inválida");
  if (d.units === null) errors.push("Unidades por presentación inválidas");
  else if (d.units > MAX_UNITS_PER_PACKAGE) errors.push("Unidades por presentación demasiado altas");
  if (d.stockUnits !== null && d.stockUnits > 1_000_000) errors.push("Demasiadas unidades");
  if (d.packagePriceCents === null) errors.push("Precio inválido");
  else if (d.unitCostCents !== null && d.unitCostCents > MAX_UNIT_COST) errors.push("Precio demasiado alto");
  if (d.salePriceCents !== null && d.salePriceCents > MAX_SALE_PRICE) errors.push("Precio de venta demasiado alto");
  if (row.lineTotal.trim() && d.lineTotalCents === null) errors.push("Total de línea inválido");

  if (!row.expiry.trim()) errors.push("Falta el vencimiento");
  else if (d.expiryIso === null) errors.push("Vencimiento inválido");
  else if (d.expiryIso <= today) errors.push("El vencimiento ya pasó");
  else if (isFarExpiry(d.expiryIso, today)) warnings.push("Vencimiento muy lejano: ¿está bien leído?");

  if (row.lot.trim().length > 50) errors.push("Lote demasiado largo");

  if (row.productSource === "suggested") {
    warnings.push("Producto sugerido por la descripción: confirma que es el correcto");
  }
  if (
    d.documentLineCents !== null &&
    d.lineTotalCents !== null &&
    d.documentLineCents !== d.lineTotalCents
  ) {
    warnings.push("Cantidad × precio no coincide con el total de la línea");
  }
  if (d.salePriceCents && d.unitCostCents !== null && d.salePriceCents < d.unitCostCents) {
    warnings.push("El precio de venta es menor que el costo por unidad");
  }
  return { errors, warnings };
}

export type RowStatus = "error" | "warning" | "ok";

export function rowStatus(row: PurchaseRow, today: string): RowStatus {
  const { errors, warnings } = rowIssues(row, today);
  if (errors.length) return "error";
  if (warnings.length && !row.confirmed) return "warning";
  return "ok";
}

export function rowsTotals(rows: PurchaseRow[]) {
  let documentLines = 0;
  let stored = 0;
  for (const r of rows) {
    const d = derive(r);
    if (d.documentLineCents !== null) documentLines += d.documentLineCents;
    if (d.stockUnits !== null && d.unitCostCents !== null) stored += d.stockUnits * d.unitCostCents;
  }
  return { documentLines, stored, rounding: stored - documentLines };
}

/** Una fila vacía (sin nada escrito) no cuenta: se ignora al registrar. */
export const isBlankRow = (r: PurchaseRow) =>
  !r.supplierCode &&
  !r.description &&
  !r.productId &&
  !r.isNew &&
  !r.um &&
  !r.qty &&
  !r.packagePrice &&
  !r.lineTotal &&
  !r.expiry &&
  !r.lot &&
  !r.salePrice &&
  !r.category;

const normCode = (c: string) => c.trim().toUpperCase();

/** Vínculos aprendidos: el código del proveedor elige el producto y sus unidades por presentación. */
export function applyLinks(row: PurchaseRow, links: SupplierLink[]): PurchaseRow {
  // productSource "manual" sin producto = la persona quitó el vínculo a propósito
  if (row.productId || row.productSource === "manual" || !row.supplierCode.trim()) return row;
  const link = links.find((l) => normCode(l.supplierCode) === normCode(row.supplierCode));
  if (!link) return row;
  return {
    ...row,
    productId: link.productId,
    productName: link.productName,
    productSource: "linked",
    unitsPerPackage: row.unitsEdited ? row.unitsPerPackage : String(link.unitsPerPackage),
    isNew: false,
  };
}

/** Sugerencia por descripción: solo si es clara; queda por confirmar. */
export function applyAutoMatch(row: PurchaseRow, catalog: CatalogName[]): PurchaseRow {
  if (row.productId || row.isNew || row.productSource === "manual" || !row.description.trim()) return row;
  const match = autoMatch(row.description, catalog);
  if (!match) return row;
  return {
    ...row,
    productId: match.product.id,
    productName: match.product.commercialName,
    productSource: "suggested",
  };
}

export function rowFromPasted(p: PastedRow, links: SupplierLink[], catalog: CatalogName[]): PurchaseRow {
  const base: PurchaseRow = {
    ...emptyRow(),
    supplierCode: p.code,
    description: p.description,
    qty: p.qty,
    um: p.um,
    unitsPerPackage: String(suggestUnitsPerPackage(p.description, p.um)),
    packagePrice: p.price,
    lineTotal: p.total,
    expiry: p.expiry,
  };
  return applyAutoMatch(applyLinks(base, links), catalog);
}

export type Header = {
  supplier: string;
  documentNumber: string;
  documentDate: string;
  otherCharges: string;
};

/** Solicitud a la API. Las filas deben estar sin errores; las vacías se omiten. */
export function buildPayload(header: Header, rows: PurchaseRow[]): CreatePurchaseInput {
  const items = rows
    .filter((r) => !isBlankRow(r))
    .map((r) => {
      const d = derive(r);
      return {
        ...(r.isNew
          ? { newProduct: { commercialName: r.description.trim(), category: r.category || undefined } }
          : { productId: r.productId }),
        lotNumber: r.lot.trim() || undefined,
        expiryDate: d.expiryIso!,
        purchasePrice: d.unitCostCents!,
        quantity: d.stockUnits!,
        salePrice: d.salePriceCents && d.salePriceCents > 0 ? d.salePriceCents : undefined,
        supplierCode: r.supplierCode.trim() || undefined,
        unitsPerPackage: d.units!,
      };
    });
  return {
    supplier: header.supplier.trim() || undefined,
    documentNumber: header.documentNumber.trim() || undefined,
    documentDate: header.documentDate || undefined,
    otherCharges: header.otherCharges.trim() ? toCents(header.otherCharges) : 0,
    items,
  };
}

/**
 * Edición de una fila (sobre su versión efectiva, con el vínculo ya aplicado). Cambiar el código
 * de una fila vinculada rompe el vínculo: el producto y las unidades eran del código anterior.
 */
export function applyEdit(base: PurchaseRow, patch: Partial<PurchaseRow>): PurchaseRow {
  const next: PurchaseRow = { ...base, confirmed: false, ...patch };
  if (patch.supplierCode !== undefined && base.productSource === "linked" && patch.productId === undefined) {
    return {
      ...next,
      productId: "",
      productName: "",
      productSource: "",
      unitsPerPackage: base.unitsEdited
        ? base.unitsPerPackage
        : String(suggestUnitsPerPackage(base.description, base.um)),
    };
  }
  return next;
}
