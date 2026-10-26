"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/use-debounce";
import { useProducts } from "../hooks/use-products";

export type PickedProduct = { id: string; commercialName: string };

/** Buscador de producto: escribe, elige uno de los primeros resultados. */
export function ProductPicker({
  selected,
  onSelect,
}: {
  selected: PickedProduct | null;
  onSelect: (product: PickedProduct | null) => void;
}) {
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim());
  const { data } = useProducts({ q, page: 1, includeInactive: false });

  if (selected) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">{selected.commercialName}</span>
        <Button variant="outline" size="sm" onClick={() => onSelect(null)}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <Input
        placeholder="Buscar producto"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="max-h-60 overflow-auto rounded-md border">
        {(data?.items ?? []).slice(0, 8).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => onSelect({ id: p.id, commercialName: p.commercialName })}
            >
              {p.commercialName}
              {p.genericName && (
                <span className="text-muted-foreground"> · {p.genericName}</span>
              )}
            </button>
          </li>
        ))}
        {data?.items.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
        )}
      </ul>
    </div>
  );
}
