// Reglas puras del registro de compras. Dinero en centavos; fechas ISO `YYYY-MM-DD`.
import { addDays, isRealDate } from "./dates";

const pad = (n: number) => String(n).padStart(2, "0");

export function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Vencimiento escrito a mano o leído de un documento -> ISO.
 * Acepta dd/mm/aaaa, mm/aaaa, mm/aa (y `-` como separador); sin día = último día del mes.
 * La letra O se lee como 0 (confusión típica del OCR). Devuelve null si no es una fecha real.
 */
export function parseExpiry(input: string): string | null {
  const text = input.trim().replace(/[oO]/g, "0");
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return isRealDate(text) ? text : null;

  const parts = text.split(/[/.-]/).map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  const year = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

  let d: number | null = null;
  let m: number;
  let y: number;
  if (parts.length === 3) {
    if (parts[2].length !== 2 && parts[2].length !== 4) return null;
    [d, m, y] = [Number(parts[0]), Number(parts[1]), year(parts[2])];
  } else if (parts.length === 2) {
    if (parts[1].length !== 2 && parts[1].length !== 4) return null;
    [m, y] = [Number(parts[0]), year(parts[1])];
  } else return null;

  if (m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  const day = d ?? lastDayOfMonth(y, m);
  const iso = `${y}-${pad(m)}-${pad(day)}`;
  return isRealDate(iso) ? iso : null;
}

/** Unidades por presentación sugeridas desde `... X 25` si la unidad es CAJ o PAQ; si no, 1. */
export function suggestUnitsPerPackage(description: string, um: string) {
  if (!["CAJ", "PAQ"].includes(um.trim().toUpperCase())) return 1;
  const all = [...description.matchAll(/\bX\s*(\d{1,4})\b/gi)];
  const n = all.length ? Number(all[all.length - 1][1]) : 1;
  return n >= 1 ? n : 1;
}

/** Costo por unidad = precio de la presentación ÷ unidades, al centavo más cercano. */
export const unitCost = (packagePriceCents: number, units: number) =>
  Math.round(packagePriceCents / units);

/** Lo que el redondeo suma o resta al total de la línea (stock × costo unitario − total del documento). */
export const roundingDiff = (lineTotalCents: number, stockUnits: number, unitCostCents: number) =>
  stockUnits * unitCostCents - lineTotalCents;

/** Lote automático: `AAAAMM` del vencimiento; con `-2`, `-3`… si ya existe para el producto. */
export function autoLotNumber(expiryIso: string, existing: Set<string>) {
  const base = expiryIso.slice(0, 7).replace("-", "");
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Precio de venta sugerido: costo + margen %, redondeado hacia arriba a 10 céntimos. */
export function suggestSalePrice(unitCostCents: number, marginPercent: number) {
  const raw = (unitCostCents * (100 + marginPercent)) / 100;
  return Math.ceil(raw / 10 - 1e-9) * 10;
}

/** Cuadre contra el total del documento: diferencia > 0 = el documento dice más que la suma. */
export function documentBalance(p: {
  linesTotalCents: number;
  otherChargesCents: number;
  documentTotalCents: number | null;
}) {
  const expected = p.linesTotalCents + p.otherChargesCents;
  return {
    expected,
    diff: p.documentTotalCents === null ? null : p.documentTotalCents - expected,
  };
}

export const EXPIRY_FAR_YEARS = 10;

/** Vencimiento demasiado lejano para ser creíble (probable error de lectura). */
export const isFarExpiry = (expiryIso: string, today: string) =>
  expiryIso > addDays(today, 365 * EXPIRY_FAR_YEARS);
