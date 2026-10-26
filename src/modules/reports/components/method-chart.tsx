"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatSoles } from "@/lib/money";
import { CHART_COLORS, TOOLTIP_STYLE } from "./chart-colors";

/** Reparto de lo cobrado entre efectivo y Yape. */
export function MethodChart({ cashCents, yapeCents }: { cashCents: number; yapeCents: number }) {
  const data = [
    { name: "Efectivo", value: cashCents / 100, color: CHART_COLORS.cash },
    { name: "Yape", value: yapeCents / 100, color: CHART_COLORS.yape },
  ].filter((d) => d.value > 0);
  return (
    <div className="h-52 w-full" role="img" aria-label="Efectivo y Yape">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatSoles(Math.round(Number(value) * 100))} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
