// Inicio y contadores del menú (spec 023): cálculos puros, sin base de datos.
import type { PermissionCode } from "./permissions";

export const HOURS_FROM = 8;
export const HOURS_TO = 19;

export type HourPoint = { hour: number; label: string; todayCents: number; yesterdayCents: number };

/**
 * Ventas por hora (hora de Lima) de hoy y de ayer. Muestra de 8 a 19 h como mínimo y se amplía
 * si hubo ventas fuera de ese horario, para no esconder ninguna.
 */
export function hourlySeries(today: { hour: number; total: number }[], yesterday: { hour: number; total: number }[]): HourPoint[] {
  const withData = [...today, ...yesterday].filter((r) => r.total > 0).map((r) => r.hour);
  const from = Math.min(HOURS_FROM, ...withData);
  const to = Math.max(HOURS_TO, ...withData);
  const at = (rows: { hour: number; total: number }[], h: number) => rows.filter((r) => r.hour === h).reduce((s, r) => s + r.total, 0);
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const hour = from + i;
    return { hour, label: `${hour} h`, todayCents: at(today, hour), yesterdayCents: at(yesterday, hour) };
  });
}

/** Ticket promedio en centavos; cero si no hubo ventas. */
export const averageTicket = (grossCents: number, count: number) => (count > 0 ? Math.round(grossCents / count) : 0);

/** Porcentaje (entero) de lo vendido que se pagó por Yape/Plin; cero si no hubo ventas. */
export const yapeSharePct = (yapeCents: number, grossCents: number) => (grossCents > 0 ? Math.round((yapeCents / grossCents) * 100) : 0);

/** Diferencia de puntos porcentuales entre hoy y ayer (Yape): positiva = hoy pesa más. */
export const pointsDelta = (todayPct: number, yesterdayPct: number) => todayPct - yesterdayPct;

type AlertSource = { expired: unknown[]; expiringSoon: unknown[]; lowStock: { stock: number }[] };

/** Por vencer (incluye lo ya vencido), stock bajo y sin stock; `total` es lo que muestra el contador de Reportes. */
export function alertCounts(a: AlertSource) {
  const expiring = a.expired.length + a.expiringSoon.length;
  const out = a.lowStock.filter((r) => r.stock <= 0).length;
  const low = a.lowStock.length - out;
  return { expiring, low, out, total: expiring + low + out };
}

export type NavCounters = { shortages?: number; alerts?: number };

/** Qué contadores puede ver un usuario: solo los de datos para los que tiene permiso. */
export function counterPlan(permissions: readonly string[]): { shortages: boolean; alerts: boolean } {
  const has = (p: PermissionCode) => permissions.includes(p);
  return { shortages: has("shortages.read"), alerts: has("reports.read") };
}
