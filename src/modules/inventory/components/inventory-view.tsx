"use client";

import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { TabBar, tabPanelProps, type TabDef } from "@/components/shared/tab-bar";
import type { ProductListItem } from "@/modules/products/types";
import { KardexPanel } from "./kardex-panel";
import { LotsPanel } from "./lots-panel";
import { ProductList } from "./product-list";

type Tab = "lots" | "kardex";

const TABS: TabDef<Tab>[] = [
  { id: "lots", label: "Lotes" },
  { id: "kardex", label: "Kardex", permission: "inventory.kardex" },
];

export function InventoryView() {
  const [tab, setTab] = useState<Tab>("lots");
  const [product, setProduct] = useState<ProductListItem | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">Elige un producto para ver sus lotes, vencimientos y stock.</p>
      <TabBar label="Inventario" idPrefix="inventario" tabs={TABS} value={tab} onChange={setTab} />

      <div {...tabPanelProps("inventario", tab)}>
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
    </div>
  );
}
