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
      <h1 className="text-xl font-semibold">Reportes</h1>
      <div className="flex gap-2" role="group" aria-label="Reporte">
        {TABS.map(([id, label]) => (
          <Button key={id} type="button" variant={tab === id ? "default" : "outline"} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === "sales" && <SalesReport />}
      {tab === "inventory" && <InventoryReport />}
      {tab === "alerts" && <AlertsReport />}
    </div>
  );
}
