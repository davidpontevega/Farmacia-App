"use client";

import { ChevronRight, PackageX, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/dates";
import { pointsDelta } from "@/lib/home";
import { formatSoles } from "@/lib/money";
import { deltaPct } from "@/lib/reports";
import { Can } from "@/modules/auth/components/can";
import { useActiveShift, useLocalOpenShift } from "@/modules/cash/hooks/use-cash";
import { useHomeSummary } from "../hooks/use-home";
import type { DayStats, HomeSummary } from "../types";

const card = "card-surface p-4";

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <Badge variant="ghost">sin datos de ayer</Badge>;
  const variant = pct > 0 ? "success" : pct < 0 ? "destructive" : "info";
  return <Badge variant={variant} className="font-bold">{pct > 0 ? "+" : pct < 0 ? "−" : ""}{Math.abs(pct)} %</Badge>;
}

function Kpi({ label, value, chip, hint }: { label: string; value: string; chip: React.ReactNode; hint: string }) {
  return (
    <div className={cn(card, "flex flex-col gap-1.5")}>
      <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
      <span className="text-2xl font-extrabold tracking-tight tabular-nums">{value}</span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {chip}
        {hint}
      </span>
    </div>
  );
}

function Kpis({ today, yesterday }: { today: DayStats; yesterday: DayStats }) {
  const points = pointsDelta(today.yapePct, yesterday.yapePct);
  return (
    <section aria-label="Indicadores del día" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Ventas de hoy" value={formatSoles(today.grossCents)} chip={<Delta pct={deltaPct(today.grossCents, yesterday.grossCents)} />} hint="frente a ayer" />
      <Kpi label="Tickets" value={String(today.tickets)} chip={<Delta pct={deltaPct(today.tickets, yesterday.tickets)} />} hint="frente a ayer" />
      <Kpi label="Ticket promedio" value={formatSoles(today.averageTicketCents)} chip={<Delta pct={deltaPct(today.averageTicketCents, yesterday.averageTicketCents)} />} hint="frente a ayer" />
      <Kpi
        label="Pagos por Yape / Plin"
        value={`${today.yapePct} %`}
        chip={<Badge variant="info" className="font-bold">{points > 0 ? "+" : points < 0 ? "−" : ""}{Math.abs(points)} pts</Badge>}
        hint="del total vendido"
      />
    </section>
  );
}

function HoursChart({ hours }: { hours: HomeSummary["hours"] }) {
  const max = Math.max(1, ...hours.flatMap((h) => [h.todayCents, h.yesterdayCents]));
  const total = (key: "todayCents" | "yesterdayCents") => hours.reduce((s, h) => s + h[key], 0);
  return (
    <section className={cn(card, "min-w-0")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">Ventas por hora</h2>
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-primary" aria-hidden="true" />Hoy</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-chart-3" aria-hidden="true" />Ayer</span>
        </span>
      </div>
      <div role="img" aria-label={`Ventas por hora. Hoy ${formatSoles(total("todayCents"))}, ayer ${formatSoles(total("yesterdayCents"))}`} className="mt-4 flex h-52 items-end gap-2 border-b">
        {hours.map((h) => (
          <div key={h.hour} className="flex h-full flex-1 items-end justify-center gap-0.5">
            <div className="w-[42%] max-w-5 rounded-t-md bg-chart-3" style={{ height: `${(h.yesterdayCents / max) * 100}%` }} />
            <div className="w-[42%] max-w-5 rounded-t-md bg-primary" style={{ height: `${(h.todayCents / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden="true">
        {hours.map((h) => (
          <span key={h.hour} className="flex-1 text-center text-xs text-muted-foreground">{h.label}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Ventas por hora, hoy y ayer</caption>
        <thead><tr><th>Hora</th><th>Hoy</th><th>Ayer</th></tr></thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h.hour}><td>{h.label}</td><td>{formatSoles(h.todayCents)}</td><td>{formatSoles(h.yesterdayCents)}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CashCard() {
  const active = useActiveShift();
  const local = useLocalOpenShift(true);
  const shift = local.data;
  // Si la caja es mía, los importes salen de mi turno; si es de otro, solo los ve un supervisor (los trae la misma respuesta).
  const own = active.data && active.data.shift !== null ? active.data.summary : undefined;
  const failed = local.error ?? active.error;
  const summary = shift?.mine ? own : shift?.summary;
  if (failed) {
    return (
      <section className={cn(card, "flex min-w-0 flex-col gap-3")}>
        <h2 className="text-base font-bold">Caja</h2>
        <p role="alert" className="text-sm text-destructive">{apiErrorMessage(failed)}</p>
      </section>
    );
  }
  if (local.isLoading || active.isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <section className={cn(card, "flex min-w-0 flex-col gap-3.5")}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Caja</h2>
        {shift ? <Badge variant={shift.stale ? "destructive" : "success"} className="font-bold">{shift.stale ? "Vencida" : "Abierta"}</Badge> : <Badge variant="warning" className="font-bold">Cerrada</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        {shift ? (
          <>La tiene <strong className="text-foreground">{shift.mine ? "tu usuario" : shift.ownerName}</strong> desde {formatDateTime(shift.openedAt)}. Es la única caja del local.</>
        ) : (
          "No hay ningún turno abierto. Quien vaya a vender debe abrir su turno."
        )}
      </p>
      {summary && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between rounded-xl bg-secondary px-3.5 py-3"><span className="text-sm font-semibold text-secondary-foreground">Efectivo esperado</span><span className="font-extrabold tabular-nums text-secondary-foreground">{formatSoles(summary.expectedCash)}</span></div>
          <div className="flex justify-between rounded-xl bg-success-soft px-3.5 py-3"><span className="text-sm font-semibold text-success">Yape / Plin esperado</span><span className="font-extrabold tabular-nums text-success">{formatSoles(summary.expectedYape)}</span></div>
        </div>
      )}
      <Link href="/caja" className="mt-auto flex h-11 items-center justify-center rounded-xl border text-sm font-bold transition-colors hover:bg-muted">Ver caja</Link>
    </section>
  );
}

function Alerts({ summary }: { summary: HomeSummary }) {
  const rows = [
    { href: "/admin/reports", count: summary.alerts.expiring, label: "Por vencer o vencidos", hint: "lotes en los próximos 30 días", tone: "warn" },
    { href: "/admin/reports", count: summary.alerts.low, label: "Stock bajo", hint: "bajo el mínimo", tone: "warn" },
    { href: "/admin/reports", count: summary.alerts.out, label: "Sin stock", hint: "no se pueden vender", tone: "bad" },
    ...(summary.shortages ? [{ href: "/admin/shortages", count: summary.shortages.open, label: "Faltantes abiertos", hint: "pedidos sin atender", tone: "info" as const }] : []),
  ] as const;
  const box = { warn: "bg-warning-soft text-warning", bad: "bg-destructive/10 text-destructive", info: "bg-secondary text-secondary-foreground" };
  return (
    <section className={card}>
      <h2 className="mb-2 text-base font-bold">Alertas</h2>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.label} className="border-t first:border-t-0">
            <Link href={r.href} className="flex min-h-14 items-center gap-3 rounded-lg transition-colors hover:bg-muted/60">
              <span className={cn("flex size-10 min-w-10 items-center justify-center rounded-xl text-base font-extrabold", box[r.tone])}>{r.count}</span>
              <span className="flex flex-1 flex-col leading-tight"><span className="text-sm font-semibold">{r.label}</span><span className="text-xs text-muted-foreground">{r.hint}</span></span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopSold({ top }: { top: HomeSummary["top"] }) {
  const max = Math.max(1, ...top.map((p) => p.units));
  return (
    <section className={card}>
      <h2 className="mb-3.5 text-base font-bold">Más vendidos hoy</h2>
      {top.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Todavía no hay ventas hoy" description="Aquí aparecerán los productos que más salgan." />
      ) : (
        <ol className="flex flex-col gap-3.5">
          {top.map((p) => (
            <li key={p.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2.5 text-sm"><span className="font-semibold">{p.name}</span><span className="tabular-nums text-muted-foreground">{p.units} und.</span></div>
              <div className="h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(p.units / max) * 100}%` }} /></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function TopMissing({ top }: { top: NonNullable<HomeSummary["shortages"]>["top"] }) {
  return (
    <section className={card}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold">Faltantes más pedidos</h2>
        <Link href="/admin/shortages" className="text-sm font-semibold text-primary hover:underline">Ver todos</Link>
      </div>
      {top.length === 0 ? (
        <EmptyState icon={PackageX} title="No hay faltantes abiertos" description="Lo que los clientes pidan y no haya aparecerá aquí." />
      ) : (
        <ul className="flex flex-col">
          {top.map((m) => (
            <li key={m.name} className="flex min-h-12 items-center gap-2.5 border-t first:border-t-0">
              <span className="flex-1 text-sm font-semibold">{m.name}</span>
              <Badge variant="warning" className="font-bold">{m.times} {m.times === 1 ? "pedido" : "pedidos"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminHome() {
  const { data, isLoading, error } = useHomeSummary(true);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <p role="alert" className="text-destructive">{apiErrorMessage(error)}</p>;
  return (
    <div className="flex flex-col gap-5">
      <Kpis today={data.today} yesterday={data.yesterday} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <HoursChart hours={data.hours} />
        <Can permission="cash.read">
          <CashCard />
        </Can>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Alerts summary={data} />
        <TopSold top={data.top} />
        {data.shortages && <TopMissing top={data.shortages.top} />}
      </div>
    </div>
  );
}
