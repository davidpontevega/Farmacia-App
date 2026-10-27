"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatSoles } from "@/lib/money";
import { CHART_COLORS, TOOLTIP_STYLE } from "./chart-colors";

/** Reparto de lo cobrado entre efectivo y Yape, con el total al centro. */
export function MethodChart({ cashCents, yapeCents }: { cashCents: number; yapeCents: number }) {
  const data = [
    { name: "Efectivo", value: cashCents / 100, color: CHART_COLORS.cash },
    { name: "Yape", value: yapeCents / 100, color: CHART_COLORS.yape },
  ].filter((d) => d.value > 0);
  return (
    <div className="relative mx-auto h-44 w-full max-w-60" role="img" aria-label="Efectivo y Yape">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatSoles(Math.round(Number(value) * 100))} contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-base font-bold tabular-nums">{formatSoles(cashCents + yapeCents)}</span>
      </div>
    </div>
  );
}
