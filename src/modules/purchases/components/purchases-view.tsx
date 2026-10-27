"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/auth/components/can";
import { PurchaseForm } from "./purchase-form";
import { PurchasesTable } from "./purchases-table";

export function PurchasesView() {
  const [tab, setTab] = useState<"new" | "history">("new");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Compras / {tab === "new" ? "Nueva compra" : "Historial"}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{tab === "new" ? "Registrar compra" : "Historial de compras"}</h1>
      </div>
      <div className="flex gap-1.5">
        <Button variant={tab === "new" ? "default" : "outline"} aria-pressed={tab === "new"} onClick={() => setTab("new")}>
          Registrar compra
        </Button>
        <Can permission="purchases.read">
          <Button variant={tab === "history" ? "default" : "outline"} aria-pressed={tab === "history"} onClick={() => setTab("history")}>
            Historial
          </Button>
        </Can>
      </div>
      {tab === "new" ? <PurchaseForm /> : <PurchasesTable />}
    </div>
  );
}
