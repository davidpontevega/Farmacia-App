"use client";

import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/auth/components/can";
import type { ProductListItem } from "@/modules/products/types";
import { KardexPanel } from "./kardex-panel";
import { LotsPanel } from "./lots-panel";
import { ProductList } from "./product-list";

export function InventoryView() {
  const [tab, setTab] = useState<"lots" | "kardex">("lots");
  const [product, setProduct] = useState<ProductListItem | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elige un producto para ver sus lotes, vencimientos y stock.</p>
      </div>
      <div className="flex gap-1.5">
        <Button variant={tab === "lots" ? "default" : "outline"} aria-pressed={tab === "lots"} onClick={() => setTab("lots")}>
          Lotes
        </Button>
        <Can permission="inventory.kardex">
          <Button variant={tab === "kardex" ? "default" : "outline"} aria-pressed={tab === "kardex"} onClick={() => setTab("kardex")}>
            Kardex
          </Button>
        </Can>
      </div>

      {tab === "lots" && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <ProductList selectedId={product?.id ?? null} onSelect={setProduct} />
          {product ? (
            <LotsPanel key={product.id} product={product} />
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card p-8 text-center text-muted-foreground">
              <PackageSearch className="size-10" aria-hidden="true" />
              <p className="text-sm">Selecciona un producto de la lista para ver sus lotes.</p>
            </div>
          )}
        </div>
      )}
      {tab === "kardex" && <KardexPanel />}
    </div>
  );
}
