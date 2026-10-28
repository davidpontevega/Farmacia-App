"use client";

import { useState } from "react";
import { TabBar, tabPanelProps, type TabDef } from "@/components/shared/tab-bar";
import { AlertsReport } from "./alerts-report";
import { InventoryReport } from "./inventory-report";
import { SalesReport } from "./sales-report";

type Tab = "sales" | "inventory" | "alerts";

const TABS: TabDef<Tab>[] = [
  { id: "sales", label: "Ventas" },
  { id: "inventory", label: "Inventario" },
  { id: "alerts", label: "Alertas" },
];

export function ReportsView() {
  const [tab, setTab] = useState<Tab>("sales");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Resumen del período, calculado con la fecha de Lima.</p>
      <TabBar label="Reporte" idPrefix="reportes" tabs={TABS} value={tab} onChange={setTab} />
      <div {...tabPanelProps("reportes", tab)} className="flex flex-col gap-4">
        {tab === "sales" && <SalesReport onSeeAlerts={() => setTab("alerts")} />}
        {tab === "inventory" && <InventoryReport />}
        {tab === "alerts" && <AlertsReport />}
      </div>
    </div>
  );
}
