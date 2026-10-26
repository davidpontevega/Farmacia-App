"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSoles } from "@/lib/money";
import type { DayRow } from "@/lib/reports";
import { CHART_COLORS, TOOLTIP_STYLE } from "./chart-colors";

/** Vendido y devuelto por día, lado a lado. */
export function DailyChart({ days }: { days: DayRow[] }) {
  const data = days.map((d) => ({
    day: d.date.slice(5).split("-").reverse().join("/"),
    Vendido: d.grossCents / 100,
    Devuelto: d.refundCents / 100,
  }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Vendido y devuelto por día">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={52} tickFormatter={(v) => `S/ ${v}`} />
          <Tooltip
            formatter={(value) => formatSoles(Math.round(Number(value) * 100))}
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          />
          <Legend iconType="circle" />
          <Bar dataKey="Vendido" fill={CHART_COLORS.sales} radius={[6, 6, 0, 0]} maxBarSize={56} />
          <Bar dataKey="Devuelto" fill={CHART_COLORS.refunds} radius={[6, 6, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
