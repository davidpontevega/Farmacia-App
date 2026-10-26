"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/auth/components/can";
import {
  ProductPicker,
  type PickedProduct,
} from "@/modules/products/components/product-picker";
import { KardexPanel } from "./kardex-panel";
import { LotsPanel } from "./lots-panel";

export function InventoryView() {
  const [tab, setTab] = useState<"lots" | "kardex">("lots");
  const [product, setProduct] = useState<PickedProduct | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Inventario</h1>
      <div className="flex gap-2">
        <Button variant={tab === "lots" ? "default" : "outline"} onClick={() => setTab("lots")}>
          Lotes
        </Button>
        <Can permission="inventory.kardex">
          <Button
            variant={tab === "kardex" ? "default" : "outline"}
            onClick={() => setTab("kardex")}
          >
            Kardex
          </Button>
        </Can>
      </div>

      {tab === "lots" && (
        <>
          <ProductPicker selected={product} onSelect={setProduct} />
          {product && <LotsPanel key={product.id} product={product} />}
        </>
      )}
      {tab === "kardex" && <KardexPanel />}
    </div>
  );
}
