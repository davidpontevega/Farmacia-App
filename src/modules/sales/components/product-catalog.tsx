"use client";

import { useMemo, useState } from "react";
import { ClipboardList, MapPin, PackageX, Pill, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatLocation } from "@/lib/location";
import { SHORTAGE_NAME_MAX } from "@/lib/shortages";
import { formatSoles } from "@/lib/money";
import { useDebounce } from "@/lib/use-debounce";
import { Can } from "@/modules/auth/components/can";
import { StockStatusBadge } from "@/modules/products/components/stock-status-badge";
import { useProducts } from "@/modules/products/hooks/use-products";
import { ShortageDialog } from "@/modules/shortages/components/shortage-dialog";
import { useCartStore } from "../store/cart-store";

const ALL = "Todos";

/** Buscador y cuadrícula de productos: un clic agrega al carrito. */
export function ProductCatalog({ onPrescription }: { onPrescription: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [noting, setNoting] = useState(false);
  const add = useCartStore((s) => s.add);
  const text = search.trim();
  const q = useDebounce(text);
  const { data, isLoading, isFetching, error } = useProducts({ q, page: 1, includeInactive: false });
  // Entre lo que se teclea y lo que se consulta hay un retardo: ahí `data` es de la búsqueda anterior.
  const searching = isFetching || text !== q;

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set((data?.items ?? []).map((p) => p.category).filter((c): c is string => !!c))).sort()],
    [data],
  );
  // Si la categoría elegida ya no está entre los resultados, no se filtra por ella (no quedaría cómo quitar el filtro).
  const activeCategory = categories.includes(category) ? category : ALL;
  const items = (data?.items ?? []).filter((p) => activeCategory === ALL || p.category === activeCategory);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
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
        <Button type="button" size="lg" className="h-12 rounded-xl" onClick={onPrescription}>
          <ClipboardList className="size-4" aria-hidden="true" />
          Receta
        </Button>
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
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">{searching ? "Buscando…" : "No se encontraron productos"}</p>
          {!searching && text.length >= 2 && (
            <Can permission="shortages.create">
              <Button type="button" variant="outline" onClick={() => setNoting(true)}>
                <PackageX className="size-4" aria-hidden="true" />
                No lo tengo: anotar «{text}» como faltante
              </Button>
            </Can>
          )}
        </div>
      )}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
        {items.map((p) => {
          const soldOut = p.sellableStock <= 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={soldOut}
                aria-label={`Agregar ${p.commercialName} al carrito, ${formatSoles(p.salePrice)}${soldOut ? ", sin stock" : ""}`}
                onClick={() => add({ productId: p.id, name: p.commercialName, unitPrice: p.salePrice, location: formatLocation(p.shelf, p.shelfRow), stock: p.sellableStock })}
                className="group flex h-full min-h-44 w-full flex-col gap-2.5 card-surface p-3.5 text-left shadow-sm transition-all hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 disabled:shadow-none"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary" aria-hidden="true">
                    <Pill className="size-[18px]" />
                  </span>
                  <StockStatusBadge status={soldOut ? "out" : p.status} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="line-clamp-2 block text-sm font-bold leading-snug">{p.commercialName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[p.genericName, p.laboratory].filter(Boolean).join(" · ") || " "}</span>
                  {p.matchedAlias && <span className="block truncate text-[11px] text-secondary-foreground">Coincide con «{p.matchedAlias}»</span>}
                </span>
                {formatLocation(p.shelf, p.shelfRow) && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-secondary-foreground">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {formatLocation(p.shelf, p.shelfRow)}
                  </span>
                )}
                <span className="mt-auto flex items-end justify-between gap-2">
                  <span className="flex flex-col leading-tight">
                    <span className="text-lg font-extrabold tabular-nums">{formatSoles(p.salePrice)}</span>
                    <span className="text-xs text-muted-foreground">Stock {p.sellableStock}</span>
                  </span>
                  <span className={`flex size-9 items-center justify-center rounded-xl text-primary-foreground transition-colors ${soldOut ? "bg-muted-foreground/50" : "bg-primary group-hover:bg-primary/90"}`} aria-hidden="true">
                    <Plus className="size-[18px]" />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {items.length > 0 && !searching && text.length >= 2 && (
        <Can permission="shortages.create">
          <p className="text-xs text-muted-foreground">
            ¿No es lo que buscas?{" "}
            <button type="button" className="min-h-8 font-medium text-primary underline-offset-2 hover:underline" onClick={() => setNoting(true)}>
              Anotar «{text}» como faltante
            </button>
          </p>
        </Can>
      )}
      {noting && <ShortageDialog source="SEARCH" initialName={text.slice(0, SHORTAGE_NAME_MAX)} onClose={() => setNoting(false)} />}
    </div>
  );
}
