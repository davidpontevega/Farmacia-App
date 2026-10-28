import { addDays, todayLima } from "@/lib/dates";
import { alertCounts, averageTicket, counterPlan, hourlySeries, yapeSharePct, type NavCounters } from "@/lib/home";
import type { DayStats, HomeSummary } from "@/modules/home/types";
import * as reportRepo from "@/server/repositories/report.repository";
import * as shortageRepo from "@/server/repositories/shortage.repository";
import { alertsReport } from "./report.service";

const TOP = 5;

async function dayStats(day: string): Promise<DayStats> {
  const t = await reportRepo.salesTotals({ from: day, to: day });
  return {
    grossCents: t.gross,
    tickets: t.salesCount,
    averageTicketCents: averageTicket(t.gross, t.salesCount),
    yapeCents: t.yape,
    yapePct: yapeSharePct(t.yape, t.gross),
  };
}

/** Todo lo del Inicio del administrador en una sola respuesta (hora y días de Lima). */
export async function homeSummary(permissions: readonly string[]): Promise<HomeSummary> {
  const canReadShortages = permissions.includes("shortages.read");
  const today = todayLima();
  const yesterday = addDays(today, -1);
  const [todayStats, yesterdayStats, hoursToday, hoursYesterday, top, alerts, openShortages] = await Promise.all([
    dayStats(today),
    dayStats(yesterday),
    reportRepo.salesByHour(today),
    reportRepo.salesByHour(yesterday),
    reportRepo.topProducts({ from: today, to: today }, "units"),
    alertsReport(30),
    canReadShortages ? shortageRepo.listGrouped("OPEN") : null,
  ]);
  const { expiring, low, out } = alertCounts(alerts);
  return {
    today: todayStats,
    yesterday: yesterdayStats,
    hours: hourlySeries(hoursToday, hoursYesterday),
    top: top.slice(0, TOP).map((p) => ({ name: p.name, units: p.units })),
    alerts: { expiring, low, out },
    shortages: openShortages ? { open: openShortages.length, top: openShortages.slice(0, TOP).map((g) => ({ name: g.name, times: g.timesRequested })) } : null,
  };
}

/** Contadores del menú: solo se calcula (y se devuelve) lo que el usuario tiene permiso de ver. */
export async function navCounters(permissions: readonly string[]): Promise<NavCounters> {
  const plan = counterPlan(permissions);
  const [shortages, alerts] = await Promise.all([
    plan.shortages ? shortageRepo.listGrouped("OPEN") : null,
    plan.alerts ? alertsReport(30) : null,
  ]);
  return {
    ...(shortages ? { shortages: shortages.length } : {}),
    ...(alerts ? { alerts: alertCounts(alerts).total } : {}),
  };
}
