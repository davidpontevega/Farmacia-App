"use client";

import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { classifyLines, mainTerm, MAX_PRESCRIPTION_LINES, MAX_QUANTITY, parsePrescription, rankLine } from "@/lib/prescription";
import { isUncertainLine } from "@/lib/prescription-read";
import { useProductsByTerms } from "@/modules/products/hooks/use-products";
import { useCreateShortages } from "@/modules/shortages/hooks/use-shortages";
import { useCartStore } from "../store/cart-store";
import { PrescriptionPhoto } from "./prescription-photo";

type Override = { choice?: string | "none"; quantity?: number; dropped?: boolean };

const EXAMPLE = "Amoxicilina 500 mg x 21\n2 paracetamol 500\nLoratadina 10 mg #10";

/** Receta a carrito: una línea por medicamento, el cajero confirma el producto de cada una. */
export function PrescriptionDialog({ readerEnabled, onClose }: { readerEnabled: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [photoMode, setPhotoMode] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  // La miniatura vive solo mientras el diálogo está abierto (spec 016: nada se conserva).
  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb); }, [thumb]);
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

  // Spec 017: lo que no se pudo atender se anota como faltante (el cajero puede quitar líneas con la casilla).
  const createShortages = useCreateShortages();
  const [keep, setKeep] = useState<Record<number, boolean>>({});
  const { unattended, pending } = useMemo(
    () =>
      classifyLines(
        rows.map((r) => ({ line: r.line, candidates: r.ranked.candidates, chosenId: r.chosen?.id ?? null, none: r.none, dropped: r.dropped, failed: r.error, wanted: r.wanted })),
      ),
    [rows],
  );
  const toNote = unattended.filter((u) => keep[u.index] !== false);

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
    if (ids.size > 0) toast.success(`${ids.size} ${ids.size === 1 ? "producto agregado" : "productos agregados"} al carrito`);
    if (capped > 0) toast.warning(`${capped} ${capped === 1 ? "cantidad quedó limitada" : "cantidades quedaron limitadas"} al stock disponible; revisa el carrito`, { duration: 8000 });
    // El carrito ya quedó listo: anotar es secundario, y su aviso (con reintento) vive en el hook.
    if (toNote.length > 0) {
      createShortages.mutate({ items: toNote.map((u) => ({ name: u.name, quantity: u.quantity, source: "PRESCRIPTION" as const, productId: u.productId ?? undefined })) });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receta</DialogTitle>
          <DialogDescription>
            Una línea por medicamento. La cantidad va al final con «x 21» o «#21», o al inicio («2 paracetamol»). Tú confirmas cada producto.
          </DialogDescription>
        </DialogHeader>

        {parsed === null && photoMode ? (
          <PrescriptionPhoto
            onRead={(lines, url) => {
              setText(lines.join("\n"));
              setThumb(url);
              setPhotoMode(false);
            }}
            onCancel={() => setPhotoMode(false)}
          />
        ) : parsed === null ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setOverrides({});
              setKeep({});
              setSubmitted(text);
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="rx-text">Medicamentos de la receta</Label>
              {readerEnabled && (
                <Button type="button" variant="outline" size="sm" onClick={() => setPhotoMode(true)}>
                  Foto de la receta
                </Button>
              )}
            </div>
            {thumb && (
              <div className="flex gap-3 rounded-lg border bg-muted/40 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- recorte local (blob:) para comparar con la lectura */}
                <img src={thumb} alt="Recorte leído, para comparar con las líneas" className="max-h-28 w-auto rounded border" />
                <p role="status" className="text-xs text-muted-foreground">
                  Revisa cada línea: puede haber errores de lectura, sobre todo con letra manuscrita.
                  {!text.trim() && " No se encontraron medicamentos legibles en el recorte."}
                </p>
              </div>
            )}
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
            {thumb && text.split("\n").some(isUncertainLine) && (
              <ul aria-label="Líneas dudosas" className="flex flex-col gap-1 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                {text.split("\n").filter(isUncertainLine).map((l, i) => (
                  <li key={i}>Dudosa: {l}</li>
                ))}
              </ul>
            )}
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

            {!loading && unattended.length > 0 && (
              <fieldset className="rounded-xl border bg-warning-soft/40 p-3">
                <legend className="px-1 text-xs font-semibold text-warning">Sin atender: se anotarán como faltantes</legend>
                <ul className="flex flex-col">
                  {unattended.map((u) => (
                    <li key={u.index}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                        <input type="checkbox" checked={keep[u.index] !== false} onChange={(e) => setKeep((k) => ({ ...k, [u.index]: e.target.checked }))} />
                        <span className="flex-1">{u.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">x {u.quantity}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
            {!loading && pending > 0 && (
              <p role="status" className="text-xs text-muted-foreground">
                {pending} {pending === 1 ? "línea sin elegir no se anota" : "líneas sin elegir no se anotan"} como faltante.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubmitted(null)}>
                Editar texto
              </Button>
              <Button type="button" variant="success" disabled={loading || (included.length === 0 && toNote.length === 0)} onClick={addAll}>
                {included.length > 0 ? `Agregar al carrito (${included.length})` : "Anotar faltantes"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
