import { addDays } from "./dates";

export const EXPIRING_DAYS = 30;

export type StockStatus = "out" | "expired" | "expiring" | "low" | "ok";

/**
 * Prioridad: agotado > vencido > por vencer > stock bajo > ok.
 * `nextExpiry` es el vencimiento más próximo entre los lotes con stock.
 */
export function getStockStatus(p: {
  stock: number;
  minStock: number;
  nextExpiry: string | null;
  today: string;
}): StockStatus {
  if (p.stock <= 0) return "out";
  if (p.nextExpiry && p.nextExpiry < p.today) return "expired";
  if (p.nextExpiry && p.nextExpiry <= addDays(p.today, EXPIRING_DAYS)) return "expiring";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}

/** Un ajuste es un entero distinto de 0 que no deja el lote en negativo. */
export function canAdjust(currentStock: number, delta: number) {
  return Number.isInteger(delta) && delta !== 0 && currentStock + delta >= 0;
}
