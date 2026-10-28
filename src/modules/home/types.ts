import type { HourPoint } from "@/lib/home";

// Forma JSON de GET /api/home/summary. Montos en centavos.
export type DayStats = {
  grossCents: number;
  tickets: number;
  averageTicketCents: number;
  yapeCents: number;
  /** Porcentaje entero de lo vendido que se pagó por Yape/Plin. */
  yapePct: number;
};

export type HomeSummary = {
  today: DayStats;
  yesterday: DayStats;
  hours: HourPoint[];
  top: { name: string; units: number }[];
  alerts: { expiring: number; low: number; out: number };
  /** Nulo si el usuario no tiene permiso de leer faltantes. */
  shortages: { open: number; top: { name: string; times: number }[] } | null;
};
