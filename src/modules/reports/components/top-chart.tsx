"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSoles } from "@/lib/money";
import type { SalesSort } from "../types";
import { PALETTE, TOOLTIP_STYLE } from "./chart-colors";

type Row = { productId: string; name: string; units: number; amountCents: number; profitCents: number };

const LABEL: Record<SalesSort, string> = { units: "Unidades", amount: "Importe", profit: "Utilidad" };

/** Barras horizontales de los más vendidos, según el orden elegido. */
export function TopChart({ rows, sort }: { rows: Row[]; sort: SalesSort }) {
  const data = rows.map((r) => ({
    name: r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name,
    value: sort === "units" ? r.units : (sort === "amount" ? r.amountCents : r.profitCents) / 100,
  }));
  const format = (v: number) => (sort === "units" ? `${v} u` : formatSoles(Math.round(v * 100)));
  return (
    <div className="w-full" style={{ height: Math.max(140, data.length * 36) }} role="img" aria-label={`Más vendidos por ${LABEL[sort].toLowerCase()}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip formatter={(value) => [format(Number(value)), LABEL[sort]]} contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
