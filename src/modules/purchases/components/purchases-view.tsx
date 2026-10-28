"use client";

import { useState } from "react";
import { cn } from "cn";
import { Can } from "@/modules/auth/components/can";
import { PurchaseForm } from "./purchase-form";
import { PurchasesTable } from "./purchases-table";

type Tab = "new" | "history";

function TabButton({ tab, current, onSelect, children }: { tab: Tab; current: Tab; onSelect: (t: Tab) => void; children: React.ReactNode }) {
  const active = tab === current;
  return (
    <button
      type="button"
      role="tab"
      id={`compras-tab-${tab}`}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      aria-controls="compras-panel"
      onClick={() => onSelect(tab)}
      className={cn(
        "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function PurchasesView() {
  const [tab, setTab] = useState<Tab>("new");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Compras"
        className="flex gap-1 border-b"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
          const next = tabs[(tabs.indexOf(document.activeElement as HTMLButtonElement) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
          next?.focus();
          next?.click();
        }}
      >
        <TabButton tab="new" current={tab} onSelect={setTab}>
          Nueva compra
        </TabButton>
        <Can permission="purchases.read">
          <TabButton tab="history" current={tab} onSelect={setTab}>
            Historial
          </TabButton>
        </Can>
      </div>
      <div role="tabpanel" id="compras-panel" aria-labelledby={`compras-tab-${tab}`} className="flex flex-col gap-4">
        {tab === "new" ? <PurchaseForm /> : <PurchasesTable />}
      </div>
    </div>
  );
}
