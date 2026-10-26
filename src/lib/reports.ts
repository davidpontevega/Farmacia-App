// Reglas puras de los reportes: rangos, estados de stock, vencimientos, margen y CSV.
import { addDays, isRealDate } from "./dates";

export const MAX_RANGE_DAYS = 366;
export const EXPIRY_WINDOWS = [30, 60, 90] as const;
export type ExpiryWindow = (typeof EXPIRY_WINDOWS)[number];

const DAY_MS = 86_400_000;

/** Días entre dos fechas ISO (b − a). */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** Mensaje de error del rango «desde / hasta», o null si es válido. */
export function rangeError(from: string, to: string, today: string): string | null {
  if (!isRealDate(from) || !isRealDate(to)) return "Fecha inválida";
  if (from > to) return "«Desde» no puede ser posterior a «Hasta»";
  if (to > today) return "«Hasta» no puede ser una fecha futura";
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) return `El rango máximo es de ${MAX_RANGE_DAYS} días`;
  return null;
}

/** Accesos rápidos del rango de ventas, en hora de Lima. */
export function quickRange(kind: "today" | "yesterday" | "last7" | "month", today: string) {
  switch (kind) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
  }
}

export type StockStatus = "OUT" | "LOW" | "OK";

export function stockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "OUT";
  return minStock > 0 && stock <= minStock ? "LOW" : "OK";
}

/** Alerta de stock: con mínimo definido y stock en el mínimo o por debajo (sin stock incluido). */
export const isStockAlert = (stock: number, minStock: number) => minStock > 0 && stock <= minStock;

export type ExpiryBucket = "expired" | "soon" | null;

export function expiryBucket(daysLeft: number, window: ExpiryWindow): ExpiryBucket {
  if (daysLeft < 0) return "expired";
  return daysLeft <= window ? "soon" : null;
}

/** Margen en % con un decimal; null si no hubo ventas. */
export function marginPct(profitCents: number, salesCents: number): number | null {
  if (salesCents <= 0) return null;
  return Math.round((profitCents / salesCents) * 1000) / 10;
}

export type DayRow = { date: string; salesCount: number; grossCents: number; refundCents: number; netCents: number };

/** Una fila por día del rango, con ceros donde no hubo movimiento. */
export function fillDays(
  from: string,
  to: string,
  sales: { date: string; count: number; gross: number }[],
  refunds: { date: string; refunded: number }[],
): DayRow[] {
  const s = new Map(sales.map((r) => [r.date, r]));
  const r = new Map(refunds.map((x) => [x.date, x.refunded]));
  const out: DayRow[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const grossCents = s.get(d)?.gross ?? 0;
    const refundCents = r.get(d) ?? 0;
    out.push({ date: d, salesCount: s.get(d)?.count ?? 0, grossCents, refundCents, netCents: grossCents - refundCents });
  }
  return out;
}

/** 12345 -> "123.45" (CSV y hojas de cálculo; sin símbolo ni separador de miles). */
export const centsText = (cents: number) =>
  `${cents < 0 ? "-" : ""}${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, "0")}`;

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  // Las celdas que empiezan con = + - @ se tomarían por fórmula al abrirlas en Excel (los números no).
  // Un importe negativo en texto ("-1.50") no es una fórmula: se deja tal cual para que Excel lo lea como número.
  const isFormula = typeof value === "string" && /^[=+\-@\t\r]/.test(text) && !/^-\d+(\.\d+)?$/.test(text);
  const safe = isFormula ? `'${text}` : text;
  return /[";,\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// Excel en español separa las columnas con punto y coma (la coma es el decimal en muchas regiones).
const SEPARATOR = ";";

/** CSV UTF-8 con marca de orden de bytes (Excel abre bien las tildes). */
export function toCsv(headers: string[], rows: (string | number | null)[][]) {
  return `﻿${[headers, ...rows].map((r) => r.map(csvCell).join(SEPARATOR)).join("\r\n")}\r\n`;
}
