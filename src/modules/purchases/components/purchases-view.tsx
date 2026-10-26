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
      <h1 className="text-xl font-semibold">Compras</h1>
      <div className="flex gap-2">
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
