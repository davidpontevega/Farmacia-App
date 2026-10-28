"use client";

import { useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryCombobox } from "@/modules/products/components/category-combobox";
import { bestMatches, searchByTerm, type CatalogName } from "@/lib/match";
import type { ProductSource, PurchaseRow } from "../rows";

const SOURCE_LABEL: Record<Exclude<ProductSource, "">, string> = {
  linked: "Vinculado",
  suggested: "Sugerido",
  manual: "Elegido",
};

type Props = {
  row: PurchaseRow;
  /** Para los nombres accesibles: "fila 3". */
  rowLabel: string;
  catalog: CatalogName[];
  onChange: (patch: Partial<PurchaseRow>) => void;
};

export function PurchaseProductCell({ row, rowLabel, catalog, onChange }: Props) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Al cambiar de estado el control enfocado desaparece: se lleva el foco a donde sigue el trabajo.
  const focusSoon = (col: string) => {
    const tr = root.current?.closest("tr");
    setTimeout(() => tr?.querySelector<HTMLInputElement>(`input[data-col="${col}"]`)?.focus(), 0);
  };

  const doubtful = row.uncertain?.includes("description") ?? false;

  if (row.isNew) {
    return (
      <div ref={root} className="flex min-w-56 flex-col gap-1">
        <Input
          data-col="newName"
          className={doubtful ? "border-warning-ring ring-1 ring-warning-ring bg-warning-soft" : undefined}
          aria-invalid={doubtful ? true : undefined}
          aria-description={doubtful ? "Leído con dudas: verifica" : undefined}
          aria-label={`Nombre del producto nuevo, ${rowLabel}`}
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <div className="flex items-center gap-1">
          <div className="flex-1">
            <CategoryCombobox
              aria-label={`Categoría del producto nuevo, ${rowLabel}`}
              className="h-8 text-xs"
              value={row.category}
              onChange={(category) => onChange({ category })}
            />
          </div>
          <Button type="button" size="xs" variant="ghost" onClick={() => onChange({ isNew: false })}>
            Usar existente
          </Button>
        </div>
      </div>
    );
  }

  if (row.productId) {
    return (
      <div ref={root} className="flex min-w-56 flex-col gap-1">
        <span className="text-sm font-medium">{row.productName}</span>
        <div className="flex items-center gap-1">
          {row.productSource && (
            <Badge variant={row.productSource === "suggested" ? "outline" : "secondary"}>
              {SOURCE_LABEL[row.productSource]}
            </Badge>
          )}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label={`Cambiar el producto de la ${rowLabel}`}
            onClick={() => {
              onChange({ productId: "", productName: "", productSource: "manual" });
              focusSoon("search");
            }}
          >
            Cambiar
          </Button>
        </div>
      </div>
    );
  }

  // Sin producto: lo que se escribe filtra el catálogo; sin escribir, se proponen los más parecidos a la descripción.
  const options = open
    ? term.trim()
      ? searchByTerm(term, catalog, 6)
      : bestMatches(row.description, catalog, 5).map((m) => m.product)
    : [];
  const current = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (p: CatalogName) => {
    onChange({ productId: p.id, productName: p.commercialName, productSource: "manual" });
    setTerm("");
    setOpen(false);
    focusSoon("qty");
  };

  return (
    <div ref={root} className="relative flex min-w-56 flex-col gap-1">
      {row.description && (
        <span className={doubtful ? "text-xs text-warning" : "text-xs text-muted-foreground"}>{row.description}</span>
      )}
      {/* Combobox: flechas para moverse, Enter para elegir, Escape para cerrar. */}
      <Input
        data-col="search"
        role="combobox"
        aria-label={`Buscar producto del catálogo, ${rowLabel}`}
        aria-expanded={options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={options.length > 0 ? `${listId}-${current}` : undefined}
        autoComplete="off"
        placeholder="Buscar en el catálogo…"
        value={term}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setTerm(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (Math.min(a, options.length - 1) + step + options.length) % Math.max(options.length, 1));
          } else if (e.key === "Enter" && options.length > 0) {
            e.preventDefault();
            choose(options[current]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-60 w-80 overflow-auto rounded-md border bg-background shadow-lg"
        >
          {options.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              className={`cursor-pointer px-3 py-2 text-sm ${i === current ? "bg-muted" : "hover:bg-muted"}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
            >
              {p.commercialName}
              <span className="text-muted-foreground">
                {[p.genericName, p.laboratory].filter(Boolean).length > 0 &&
                  ` · ${[p.genericName, p.laboratory].filter(Boolean).join(" · ")}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="border-primary text-primary hover:bg-secondary hover:text-primary"
        aria-label={`Crear como producto nuevo, ${rowLabel}`}
        onClick={() => {
          onChange({ isNew: true, description: row.description || term.trim() });
          focusSoon("newName");
        }}
      >
        Crear como nuevo
      </Button>
    </div>
  );
}
