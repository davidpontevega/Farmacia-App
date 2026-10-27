"use client";

import { useMemo, useState } from "react";
import { MapPin, Pill, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatLocation } from "@/lib/location";
import { formatSoles } from "@/lib/money";
import { useDebounce } from "@/lib/use-debounce";
import { StockStatusBadge } from "@/modules/products/components/stock-status-badge";
import { useProducts } from "@/modules/products/hooks/use-products";
import { useCartStore } from "../store/cart-store";

const ALL = "Todos";

/** Buscador y cuadrícula de productos: un clic agrega al carrito. */
export function ProductCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const add = useCartStore((s) => s.add);
  const q = useDebounce(search.trim());
  const { data, isLoading, isFetching, error } = useProducts({ q, page: 1, includeInactive: false });

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set((data?.items ?? []).map((p) => p.category).filter((c): c is string => !!c))).sort()],
    [data],
  );
  // Si la categoría elegida ya no está entre los resultados, no se filtra por ella (no quedaría cómo quitar el filtro).
  const activeCategory = categories.includes(category) ? category : ALL;
  const items = (data?.items ?? []).filter((p) => activeCategory === ALL || p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre comercial o genérico…"
          aria-label="Buscar producto"
          className="h-12 rounded-xl border-2 border-primary bg-card pl-12 text-base md:text-base"
        />
      </div>

      {categories.length > 1 && (
        <div role="group" aria-label="Categoría" className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={activeCategory === c}
              onClick={() => setCategory(c)}
              className={`min-h-8 rounded-full border px-3 text-xs transition-colors ${
                activeCategory === c ? "border-primary bg-primary font-semibold text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && (
        <p role="alert" className="text-destructive">
          {apiErrorMessage(error)}
        </p>
      )}
      {data && items.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">{isFetching ? "Buscando…" : "No se encontraron productos"}</p>
      )}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
        {items.map((p) => {
          const soldOut = p.sellableStock <= 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={soldOut}
                onClick={() => add({ productId: p.id, name: p.commercialName, unitPrice: p.salePrice, location: formatLocation(p.shelf, p.shelfRow), stock: p.sellableStock })}
                className="flex h-full min-h-11 w-full flex-col gap-1.5 rounded-xl border bg-card p-2.5 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-primary" aria-hidden="true">
                    <Pill className="size-3.5" />
                  </span>
                  <StockStatusBadge status={soldOut ? "out" : p.status} />
                </span>
                <span>
                  <span className="line-clamp-2 block text-[13px] font-semibold leading-snug">{p.commercialName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[p.genericName, p.laboratory].filter(Boolean).join(" · ") || " "}</span>
                </span>
                {formatLocation(p.shelf, p.shelfRow) && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-secondary-foreground">
                    <MapPin className="size-3" aria-hidden="true" />
                    {formatLocation(p.shelf, p.shelfRow)}
                  </span>
                )}
                <span className="mt-auto flex items-baseline justify-between">
                  <span className="text-sm font-bold tabular-nums">{formatSoles(p.salePrice)}</span>
                  <span className="text-[11px] text-muted-foreground">Stock {p.sellableStock}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
