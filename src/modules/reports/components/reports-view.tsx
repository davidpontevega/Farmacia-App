"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertsReport } from "./alerts-report";
import { InventoryReport } from "./inventory-report";
import { SalesReport } from "./sales-report";

const TABS = [
  ["sales", "Ventas"],
  ["inventory", "Inventario"],
  ["alerts", "Alertas"],
] as const;

export function ReportsView() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("sales");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen del período, calculado con la fecha de Lima.</p>
      </div>
      <div className="flex gap-1.5" role="group" aria-label="Reporte">
        {TABS.map(([id, label]) => (
          <Button key={id} type="button" variant={tab === id ? "default" : "outline"} className="h-10 px-5" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === "sales" && <SalesReport onSeeAlerts={() => setTab("alerts")} />}
      {tab === "inventory" && <InventoryReport />}
      {tab === "alerts" && <AlertsReport />}
    </div>
  );
}
