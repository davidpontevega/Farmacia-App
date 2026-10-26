"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatSoles } from "@/lib/money";
import { useDebounce } from "@/lib/use-debounce";
import { useProducts } from "@/modules/products/hooks/use-products";
import { useCartStore } from "../store/cart-store";

const MIN_CHARS = 2;

export function ProductSearch() {
  const [search, setSearch] = useState("");
  const add = useCartStore((s) => s.add);
  const q = useDebounce(search.trim());
  const enabled = q.length >= MIN_CHARS;
  const { data, isFetching } = useProducts(
    { q, page: 1, includeInactive: false },
    { enabled },
  );

  return (
    <div className="relative">
      <Input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar producto por nombre comercial o genérico…"
        aria-label="Buscar producto"
        className="h-11"
      />
      {enabled && data && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border bg-background shadow-lg">
          {data.items.length === 0 && (
            <li className="px-4 py-3 text-center text-sm text-muted-foreground">
              {isFetching ? "Buscando…" : "No se encontraron productos"}
            </li>
          )}
          {data.items.map((p) => {
            const soldOut = p.sellableStock <= 0;
            return (
              <li key={p.id} className="border-b last:border-0">
                <button
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    add({
                      productId: p.id,
                      name: p.commercialName,
                      unitPrice: p.salePrice,
                      stock: p.sellableStock,
                    });
                    setSearch("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    <span className="block text-sm font-medium">{p.commercialName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[p.genericName, p.laboratory].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold">{formatSoles(p.salePrice)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {soldOut ? "Agotado" : `Stock ${p.sellableStock}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
