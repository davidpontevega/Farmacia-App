"use client";

import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatLocation } from "@/lib/location";
import { formatSoles } from "@/lib/money";
import { interpret, matchProducts, MEDICAL_NOTICE, QUICK_QUERIES, type Interpretation } from "@/lib/symptoms";
import { useProducts } from "@/modules/products/hooks/use-products";

type Recent = { query: string; at: Date };

export function ConsultView() {
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);

  const reading: Interpretation | null = useMemo(() => (asked ? interpret(asked) : null), [asked]);
  const ingredients = reading?.found ? reading.ingredients : undefined;
  const { data, isLoading, isPlaceholderData, error } = useProducts({ names: ingredients, page: 1, includeInactive: false }, { enabled: !!ingredients });
  // Con `keepPreviousData` el query puede traer los productos de la consulta anterior: no se cruzan con los principios nuevos.
  const result = useMemo(() => (ingredients && data && !isPlaceholderData ? matchProducts(ingredients, data.items) : null), [ingredients, data, isPlaceholderData]);

  const ask = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setText(q);
    setAsked(q);
    setRecent((r) => [{ query: q, at: new Date() }, ...r.filter((x) => x.query !== q)].slice(0, 5));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consulta de medicamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escribe el síntoma o la necesidad del cliente y mira qué hay en el local.</p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <Label htmlFor="consult-q" className="sr-only">
          Síntoma o necesidad
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="consult-q"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: pastilla para los riñones, algo para el dolor de cabeza…"
              className="h-12 pl-9 text-base md:text-base"
            />
          </div>
          <Button type="submit" size="lg" disabled={!text.trim()}>
            Consultar
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Consultas frecuentes">
          {QUICK_QUERIES.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="min-h-11 rounded-full border bg-card px-4 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              {s}
            </button>
          ))}
        </div>
      </form>

      {reading && !reading.found && (
        <section className="rounded-2xl border bg-warning-soft p-5 text-warning" role="status">
          <p className="text-sm font-semibold">No encontré coincidencias para «{asked}»</p>
          <p className="mt-1 text-xs">Prueba con otros términos o consulta con el farmacéutico.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {reading.suggestions.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="min-h-11 rounded-full border border-warning-ring/40 bg-card px-3 text-xs font-medium">
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {reading?.found && (
        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5" aria-live="polite">
          <div className="border-b pb-3">
            <p className="text-xs text-muted-foreground">Interpretación</p>
            <p className="text-sm font-semibold">{reading.description}</p>
          </div>

          {(isLoading || isPlaceholderData) && <Skeleton className="h-40 w-full" />}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error)}
            </p>
          )}

          {result && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Productos sugeridos</h2>
                <p className="text-xs text-muted-foreground">{result.products.filter((p) => p.sellableStock > 0).length} con stock</p>
              </div>
              {result.products.length === 0 && <p className="text-sm text-muted-foreground">Ningún producto del catálogo coincide con estos principios activos.</p>}
              <ul className="flex flex-col gap-2">
                {result.products.map((p) => {
                  const available = p.sellableStock > 0;
                  const where = formatLocation(p.shelf, p.shelfRow);
                  return (
                    <li key={p.id} className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${available ? "bg-success-soft/50" : "bg-muted"}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{p.commercialName}</p>
                          {p.requiresRx && <Badge variant="warning">Requiere receta</Badge>}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${available ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>
                            {available ? `Stock: ${p.sellableStock}` : "Sin stock"}
                          </span>
                        </div>
                        {p.genericName && p.genericName !== p.commercialName && <p className="text-xs text-muted-foreground">Genérico: {p.genericName}</p>}
                        {p.matchedAlias && <p className="text-xs text-muted-foreground">Coincide con «{p.matchedAlias}»</p>}
                        <p className="text-xs text-muted-foreground">{reading.description}</p>
                        {where && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-secondary-foreground">
                            <MapPin className="size-3" aria-hidden="true" />
                            {where}
                          </p>
                        )}
                      </div>
                      {available && <p className="shrink-0 text-sm font-bold tabular-nums text-primary">{formatSoles(p.salePrice)}</p>}
                    </li>
                  );
                })}
              </ul>
              {result.references.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Principios activos de referencia que no están en el catálogo: <span className="font-medium">{result.references.join(", ")}</span>.
                </p>
              )}
            </>
          )}

          <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-secondary-foreground">{MEDICAL_NOTICE}</p>
        </section>
      )}

      {recent.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Consultas recientes</h2>
          <ul className="flex flex-col gap-1">
            {recent.map((r) => (
              <li key={r.query}>
                <button type="button" onClick={() => ask(r.query)} className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-muted">
                  <span>{r.query}</span>
                  <span className="text-xs text-muted-foreground">{r.at.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
