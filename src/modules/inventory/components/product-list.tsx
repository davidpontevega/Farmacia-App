"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { useDebounce } from "@/lib/use-debounce";
import { StockStatusBadge } from "@/modules/products/components/stock-status-badge";
import { useProducts } from "@/modules/products/hooks/use-products";
import type { ProductListItem } from "@/modules/products/types";

/** Lista de productos con buscador: se elige uno para ver sus lotes. */
export function ProductList({
  selectedId,
  onSelect,
  allLabel,
  onClear,
}: {
  selectedId: string | null;
  onSelect: (p: ProductListItem) => void;
  /** Si se da junto a `onClear`, la lista ofrece una primera opción «todos» que quita la selección. */
  allLabel?: string;
  onClear?: () => void;
}) {
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim());
  const { data, isLoading, error } = useProducts({ q, page: 1, includeInactive: false });

  return (
    <section aria-label="Productos" className="flex min-h-0 flex-col gap-3 rounded-2xl border bg-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input aria-label="Buscar producto" placeholder="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-9" />
      </div>
      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(error)}
        </p>
      )}
      {data && data.items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>}
      <ul className="-mx-1 flex min-h-0 flex-col gap-1 overflow-y-auto px-1">
        {allLabel && onClear && (
          <li>
            <button
              type="button"
              aria-pressed={selectedId === null}
              onClick={onClear}
              className={`flex min-h-12 w-full items-center rounded-xl border px-3 text-left text-sm font-semibold transition-colors ${
                selectedId === null ? "border-primary bg-secondary" : "border-transparent hover:bg-muted"
              }`}
            >
              {allLabel}
            </button>
          </li>
        )}
        {data?.items.map((p) => {
          const active = p.id === selectedId;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(p)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  active ? "border-primary bg-secondary" : "border-transparent hover:bg-muted"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-semibold leading-snug">{p.commercialName}</span>
                  {p.genericName && <span className="block truncate text-xs text-muted-foreground">{p.genericName}</span>}
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums">{p.stock}</span>
                  <StockStatusBadge status={p.status} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
