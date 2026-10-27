"use client";

import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatLocation } from "@/lib/location";
import { formatSoles } from "@/lib/money";
import { mainTerm, MAX_PRESCRIPTION_LINES, MAX_QUANTITY, parsePrescription, rankLine } from "@/lib/prescription";
import { useProductsByTerms } from "@/modules/products/hooks/use-products";
import { useCartStore } from "../store/cart-store";

type Override = { choice?: string | "none"; quantity?: number; dropped?: boolean };

const EXAMPLE = "Amoxicilina 500 mg x 21\n2 paracetamol 500\nLoratadina 10 mg #10";

/** Receta a carrito: una línea por medicamento, el cajero confirma el producto de cada una. */
export function PrescriptionDialog({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const setOverride = (i: number, patch: Override) => setOverrides((o) => ({ ...o, [i]: { ...o[i], ...patch } }));

  const parsed = useMemo(() => (submitted === null ? null : parsePrescription(submitted)), [submitted]);
  const queries = useProductsByTerms(parsed?.lines.map((l) => mainTerm(l.description)) ?? []);
  const loading = queries.some((q) => q.isLoading);
  const failed = queries.find((q) => q.error)?.error;

  const rows = useMemo(
    () =>
      (parsed?.lines ?? []).map((line, i) => {
        const ranked = rankLine(line.description, queries[i]?.data?.items ?? []);
        const o = overrides[i] ?? {};
        const chosenId = o.choice === "none" ? null : (o.choice ?? ranked.suggestedId);
        const chosen = ranked.candidates.find((c) => c.id === chosenId) ?? null;
        const wanted = o.quantity ?? line.quantity;
        return { line, ranked, chosen, wanted, quantity: chosen ? Math.min(wanted, chosen.sellableStock) : wanted, dropped: !!o.dropped, none: o.choice === "none", error: !!queries[i]?.isError, retry: () => void queries[i]?.refetch() };
      }),
    [parsed, queries, overrides],
  );
  const included = rows.filter((r) => !r.dropped && r.chosen);

  const addAll = () => {
    const ids = new Set<string>();
    let capped = 0;
    for (const { chosen, quantity } of included) {
      if (!chosen) continue;
      const cart = useCartStore.getState();
      const current = cart.items.find((i) => i.productId === chosen.id)?.quantity ?? 0;
      cart.add({ productId: chosen.id, name: chosen.commercialName, unitPrice: chosen.salePrice, location: formatLocation(chosen.shelf, chosen.shelfRow), stock: chosen.sellableStock });
      // Lo que ya había en el carrito (o una línea repetida) suma; el tope es el stock.
      if (current + quantity > chosen.sellableStock) capped++;
      cart.setQuantity(chosen.id, current + quantity);
      ids.add(chosen.id);
    }
    toast.success(`${ids.size} ${ids.size === 1 ? "producto agregado" : "productos agregados"} al carrito`);
    if (capped > 0) toast.warning(`${capped} ${capped === 1 ? "cantidad quedó limitada" : "cantidades quedaron limitadas"} al stock disponible; revisa el carrito`, { duration: 8000 });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receta</DialogTitle>
          <DialogDescription>
            Una línea por medicamento. La cantidad va al final con «x 21» o «#21», o al inicio («2 paracetamol»). Tú confirmas cada producto.
          </DialogDescription>
        </DialogHeader>

        {parsed === null ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setOverrides({});
              setSubmitted(text);
            }}
          >
            <Label htmlFor="rx-text">Medicamentos de la receta</Label>
            <textarea
              id="rx-text"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              spellCheck={false}
              autoComplete="off"
              className="h-56 w-full rounded-lg border bg-card p-3 text-sm"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!text.trim()}>
                Buscar productos
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            {parsed.lines.length === 0 && <p className="text-sm text-muted-foreground">No se leyó ninguna línea.</p>}
            {parsed.ignored > 0 && (
              <p role="status" className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                Se leen las primeras {MAX_PRESCRIPTION_LINES} líneas; {parsed.ignored} más se ignoraron. Haz otra receta con el resto.
              </p>
            )}
            {loading && <Skeleton className="h-40 w-full" />}
            {failed && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(failed)}
              </p>
            )}

            {!loading && (
              <ul className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1">
                {rows.map(({ line, ranked, chosen, wanted, quantity, dropped, none, error, retry }, i) => (
                  <li key={i} className={`rounded-xl border p-3 ${dropped ? "bg-muted opacity-60" : "bg-card"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{line.raw}</p>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setOverride(i, { dropped: !dropped })}>
                        {dropped ? "Recuperar" : "Descartar"}
                      </Button>
                    </div>

                    {!dropped && error && (
                      <p role="alert" className="mt-2 flex items-center gap-2 text-xs text-destructive">
                        No se pudo consultar el catálogo para esta línea
                        <Button type="button" variant="outline" size="sm" onClick={retry}>
                          Reintentar
                        </Button>
                      </p>
                    )}
                    {!dropped && !error && ranked.candidates.length === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">No encontrado en el catálogo</p>
                    )}
                    {!dropped && !chosen && !none && ranked.candidates.length > 0 && (
                      <Badge variant="warning" className="mt-2">
                        Por elegir
                      </Badge>
                    )}

                    {!dropped && ranked.candidates.length > 0 && (
                      <fieldset className="mt-2 flex flex-col gap-1.5">
                        <legend className="sr-only">Producto para «{line.raw}»</legend>
                        {ranked.candidates.map((c) => {
                          const available = c.sellableStock > 0;
                          const where = formatLocation(c.shelf, c.shelfRow);
                          return (
                            <label key={c.id} className={`flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2 text-sm ${chosen?.id === c.id ? "border-primary bg-secondary" : ""} ${available ? "cursor-pointer" : "bg-muted text-muted-foreground"}`}>
                              <input type="radio" name={`rx-line-${i}`} className="mt-1" disabled={!available} checked={chosen?.id === c.id} onChange={() => setOverride(i, { choice: c.id })} />
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="flex flex-wrap items-center gap-2 font-medium">
                                  {c.commercialName}
                                  {ranked.suggestedId === c.id && <Badge variant="success">Sugerido</Badge>}
                                </span>
                                {c.genericName && c.genericName !== c.commercialName && <span className="text-xs text-muted-foreground">Genérico: {c.genericName}</span>}
                                {where && (
                                  <span className="mt-0.5 flex items-center gap-1 text-xs">
                                    <MapPin className="size-3" aria-hidden="true" />
                                    {where}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-right text-xs">
                                <span className="block font-semibold tabular-nums">{available ? formatSoles(c.salePrice) : "Sin stock"}</span>
                                {available && <span className="text-muted-foreground">Stock: {c.sellableStock}</span>}
                              </span>
                            </label>
                          );
                        })}
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-xs text-muted-foreground">
                          <input type="radio" name={`rx-line-${i}`} checked={none} onChange={() => setOverride(i, { choice: "none" })} />
                          Ninguno de estos
                        </label>
                      </fieldset>
                    )}

                    {!dropped && chosen && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Label htmlFor={`rx-qty-${i}`} className="text-xs">
                          Cantidad
                        </Label>
                        <Input
                          id={`rx-qty-${i}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={Math.min(chosen.sellableStock, MAX_QUANTITY)}
                          value={wanted}
                          onChange={(e) => setOverride(i, { quantity: Math.max(1, Math.trunc(Number(e.target.value)) || 1) })}
                          className="w-24"
                        />
                        {wanted > chosen.sellableStock && (
                          <p role="status" className="text-xs text-warning">
                            La receta pide {wanted}; solo hay {chosen.sellableStock}. Se agregan {quantity}.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubmitted(null)}>
                Editar texto
              </Button>
              <Button type="button" variant="success" disabled={loading || included.length === 0} onClick={addAll}>
                Agregar al carrito{included.length > 0 ? ` (${included.length})` : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
