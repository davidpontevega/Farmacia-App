"use client";

import { useState } from "react";
import { TabBar, tabPanelProps, type TabDef } from "@/components/shared/tab-bar";
import { PurchaseForm } from "./purchase-form";
import { PurchasesTable } from "./purchases-table";

type Tab = "new" | "history";

const TABS: TabDef<Tab>[] = [
  { id: "new", label: "Nueva compra" },
  { id: "history", label: "Historial", permission: "purchases.read" },
];

export function PurchasesView() {
  const [tab, setTab] = useState<Tab>("new");

  return (
    <div className="flex flex-col gap-4">
      <TabBar label="Compras" idPrefix="compras" tabs={TABS} value={tab} onChange={setTab} />
      <div {...tabPanelProps("compras", tab)} className="flex flex-col gap-4">
        {tab === "new" ? <PurchaseForm /> : <PurchasesTable />}
      </div>
    </div>
  );
}
