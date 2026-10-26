"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayLima } from "@/lib/dates";
import { centsToInput, formatSoles, formatSolesSigned, isValidSoles, toCents } from "@/lib/money";
import { documentBalance, suggestSalePrice } from "@/lib/purchase-rules";
import { MAX_ITEMS, MAX_PURCHASE_TOTAL, nameKey } from "@/lib/purchases";
import { useDebounce } from "@/lib/use-debounce";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { clearDraft, draftKey, isEmptyDraft, useAutosaveDraft, useStoredDraft, type Draft } from "../hooks/use-draft";
import {
  useCatalogNames,
  useCreatePurchase,
  useSupplierLinks,
  useSupplierSuggestions,
} from "../hooks/use-purchases";
import {
  applyEdit,
  applyLinks,
  buildPayload,
  derive,
  emptyRow,
  isBlankRow,
  newKey,
  rowFromPasted,
  rowIssues,
  rowStatus,
  rowsTotals,
  type Header,
  type PurchaseRow,
} from "../rows";
import type { SupplierLink } from "../types";
import { PasteRowsDialog } from "./paste-rows-dialog";
import { PurchaseHeader } from "./purchase-header";
import { PurchaseRowView } from "./purchase-row";

const NO_LINKS: SupplierLink[] = [];
const COLUMNS = [
  "Código",
  "Producto",
  "Cant.",
  "Unid.",
  "Un./pres.",
  "Precio (S/)",
  "Total (S/)",
  "Vencimiento",
  "Lote",
  "P. venta (S/)",
  "Resultado",
  "",
];

const focusRow = (index: number) =>
  setTimeout(
    () =>
      document
        .querySelector<HTMLInputElement>(`tr[data-row="${index}"] input[data-col="supplierCode"]`)
        ?.focus(),
    0,
  );

export function PurchaseForm() {
  const today = todayLima();
  const { userId } = usePermissions();
  const key = userId ? draftKey(userId) : null;
  const create = useCreatePurchase(() => clearDraft(key));
  const catalogQuery = useCatalogNames();
  const catalog = catalogQuery.data ?? [];

  const initialHeader = (): Header => ({ supplier: "", documentNumber: "", documentDate: today, otherCharges: "" });
  const [header, setHeader] = useState<Header>(initialHeader);
  const [documentTotal, setDocumentTotal] = useState("");
  const [margin, setMargin] = useState("");
  const [rows, setRows] = useState<PurchaseRow[]>(() => [emptyRow()]);
  const [pasteOpen, setPasteOpen] = useState(false);

  // Borrador: se guarda solo; si hay uno de una visita anterior, se ofrece restaurarlo antes de guardar encima.
  const stored = useStoredDraft(key);
  const draft = useMemo<Draft>(() => ({ header, documentTotal, margin, rows }), [header, documentTotal, margin, rows]);
  useAutosaveDraft(draft, stored === null, key);

  // Proveedor reconocido -> sus vínculos aprendidos (código -> producto y unidades).
  const typedSupplier = useDebounce(header.supplier.trim(), 300);
  const suggestions = useSupplierSuggestions(typedSupplier).data ?? [];
  const supplierId =
    suggestions.find((s) => nameKey(s.name) === nameKey(header.supplier))?.id ?? null;
  const linksQuery = useSupplierLinks(supplierId);
  const links = linksQuery.data ?? NO_LINKS;

  const effective = useMemo(() => rows.map((r) => applyLinks(r, links)), [rows, links]);
  const byKey = useMemo(() => new Map(effective.map((r) => [r.key, r])), [effective]);
  const filled = effective.filter((r) => !isBlankRow(r));

  const updateRow = (key: string, patch: Partial<PurchaseRow>) =>
    setRows((prev) =>
      prev.map((r) =>
        // Al editar se fija en la fila lo que mostraba (vínculo incluido) y se pide revisar de nuevo.
        r.key === key ? applyEdit(byKey.get(key) ?? r, patch) : r,
      ),
    );

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
    focusRow(rows.length);
  };
  const removeRow = (key: string) =>
    setRows((prev) => (prev.length <= 1 ? [emptyRow()] : prev.filter((r) => r.key !== key)));
  const duplicateRow = (key: string) =>
    setRows((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      const src = byKey.get(key) ?? prev[i];
      const copy: PurchaseRow = {
        ...src,
        key: newKey(),
        qty: "",
        lineTotal: "",
        expiry: "",
        lot: "",
        confirmed: false,
      };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  const enterLast = (index: number) => {
    if (index >= rows.length - 1) addRow();
    else focusRow(index + 1);
  };

  const addPasted = (parsed: ReturnType<typeof import("@/lib/paste-rows").parsePastedRows>) => {
    const added = parsed.map((p) =>
      p.row ? rowFromPasted(p.row, links, catalog) : { ...emptyRow(), description: p.raw },
    );
    setRows((prev) => [...(prev.length === 1 && isBlankRow(prev[0]) ? [] : prev), ...added]);
  };

  const createUnmatchedAsNew = () =>
    setRows((prev) =>
      prev.map((r) => {
        const e = byKey.get(r.key) ?? r;
        return !e.productId && !e.isNew && e.description.trim()
          ? { ...e, isNew: true, confirmed: false }
          : r;
      }),
    );

  const marginValue = Number(margin.replace(",", "."));
  const marginOk = margin.trim() !== "" && Number.isFinite(marginValue) && marginValue >= 0;
  const applyMargin = () =>
    setRows((prev) =>
      prev.map((r) => {
        const e = byKey.get(r.key) ?? r;
        const cost = derive(e).unitCostCents;
        if (!e.isNew || cost === null) return r;
        return { ...e, salePrice: centsToInput(suggestSalePrice(cost, marginValue)), confirmed: false };
      }),
    );

  const confirmWarnings = () =>
    setRows((prev) =>
      prev.map((r) => {
        const e = byKey.get(r.key) ?? r;
        // Una sugerencia por descripción mueve stock de un producto: se confirma fila por fila.
        if (e.productSource === "suggested") return r;
        const { errors, warnings } = rowIssues(e, today);
        return errors.length === 0 && warnings.length > 0 ? { ...e, confirmed: true } : r;
      }),
    );

  // Totales y cuadre
  const totals = rowsTotals(filled);
  const otherCents = header.otherCharges.trim() ? (isValidSoles(header.otherCharges) ? toCents(header.otherCharges) : null) : 0;
  const documentTotalCents = documentTotal.trim() ? (isValidSoles(documentTotal) ? toCents(documentTotal) : null) : null;
  const balance = documentBalance({
    linesTotalCents: totals.documentLines,
    otherChargesCents: otherCents ?? 0,
    documentTotalCents,
  });

  const statuses = filled.map((r) => rowStatus(r, today));
  const errorCount = statuses.filter((s) => s === "error").length;
  const warningCount = statuses.filter((s) => s === "warning").length;
  const suggestedPending = filled.filter((r) => r.productSource === "suggested" && !r.confirmed).length;
  const storedTotal = totals.stored + (otherCents ?? 0);
  const headerError =
    otherCents === null
      ? "Otros gastos inválidos"
      : otherCents > MAX_PURCHASE_TOTAL || storedTotal > MAX_PURCHASE_TOTAL
        ? "El total de la compra es demasiado grande"
        : filled.length > MAX_ITEMS
          ? `Una compra admite hasta ${MAX_ITEMS} filas`
          : documentTotal.trim() && documentTotalCents === null
        ? "Total del documento inválido"
        : header.documentDate > today
          ? "La fecha del documento no puede ser futura"
          : null;
  const canSubmit = filled.length > 0 && errorCount === 0 && warningCount === 0 && !headerError && !create.isPending;

  const reset = () => {
    setRows([emptyRow()]);
    setHeader(initialHeader());
    setDocumentTotal("");
    setMargin("");
    clearDraft(key);
  };

  const restore = () => {
    if (!stored) return;
    setHeader({ ...initialHeader(), ...stored.header });
    setDocumentTotal(stored.documentTotal ?? "");
    setMargin(stored.margin ?? "");
    setRows(stored.rows.length ? stored.rows.map((r) => ({ ...emptyRow(), ...r })) : [emptyRow()]);
    clearDraft(key);
  };

  const submit = () =>
    create.mutate(buildPayload(header, filled), { onSuccess: reset });

  return (
    <div className="flex flex-col gap-4">
      {stored && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <span>
            Hay un borrador de una compra sin registrar ({stored.rows.filter((r) => !isBlankRow(r)).length} fila(s)).
          </span>
          <span className="flex gap-2">
            <Button size="sm" onClick={restore}>
              {isEmptyDraft(draft) ? "Restaurar" : "Restaurar (reemplaza lo que escribiste)"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => clearDraft(key)}>
              Descartar
            </Button>
          </span>
        </div>
      )}

      {(catalogQuery.isError || linksQuery.isError) && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {catalogQuery.isError
            ? "No se pudo cargar el catálogo: no se podrán sugerir productos. Recarga la página."
            : "No se pudieron cargar los productos aprendidos de este proveedor."}
        </p>
      )}

      <PurchaseHeader
        header={header}
        onHeader={(patch) => setHeader((h) => ({ ...h, ...patch }))}
        documentTotal={documentTotal}
        onDocumentTotal={setDocumentTotal}
        suppliers={suggestions}
        today={today}
      />

      <div className="flex flex-wrap items-end gap-2">
        <Button type="button" variant="outline" onClick={() => setPasteOpen(true)}>
          Pegar filas
        </Button>
        <Button type="button" variant="outline" onClick={addRow}>
          + Agregar fila
        </Button>
        <Button type="button" variant="outline" onClick={createUnmatchedAsNew}>
          Crear como nuevos los que no tienen producto
        </Button>
        <div className="ml-auto flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="margin" className="text-xs">
              Margen % para productos nuevos
            </Label>
            <Input id="margin" className="w-24" inputMode="decimal" placeholder="Ej: 30" value={margin} onChange={(e) => setMargin(e.target.value)} />
          </div>
          <Button type="button" variant="outline" disabled={!marginOk} onClick={applyMargin}>
            Sugerir precios
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c, i) => (
                <TableHead key={i} className="whitespace-nowrap px-1">
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {effective.map((row, index) => (
              <PurchaseRowView
                key={row.key}
                row={row}
                index={index}
                today={today}
                catalog={catalog}
                onChange={updateRow}
                onRemove={removeRow}
                onDuplicate={duplicateRow}
                onEnterLast={enterLast}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-1 text-sm">
          <p>
            Líneas del documento: <strong>{formatSoles(totals.documentLines)}</strong>
            {otherCents ? ` + otros gastos ${formatSoles(otherCents)}` : ""} ={" "}
            <strong>{formatSoles(balance.expected)}</strong>
          </p>
          {balance.diff !== null && (
            <p className={balance.diff === 0 ? "font-medium text-green-600" : "font-medium text-destructive"} role="status">
              {balance.diff === 0
                ? "Cuadra con el total del documento"
                : `No cuadra con el total del documento: diferencia ${formatSolesSigned(balance.diff)}`}
            </p>
          )}
          {totals.rounding !== 0 && (
            <p className="text-xs text-muted-foreground">
              Se registrará {formatSoles(totals.stored + (otherCents ?? 0))} (diferencia de redondeo por unidad {formatSolesSigned(totals.rounding)}).
            </p>
          )}
          {headerError && <p className="text-destructive">{headerError}</p>}
          {errorCount > 0 && <p className="text-destructive">{errorCount} fila(s) con errores: corrígelas para registrar.</p>}
          {warningCount > 0 && (
            <p className="text-amber-600">
              {warningCount} fila(s) con avisos por confirmar.{" "}
              <button type="button" className="underline" onClick={confirmWarnings}>
                Confirmar los avisos que no son sugerencias
              </button>
              {suggestedPending > 0 && (
                <span> Las {suggestedPending} sugerencia(s) por descripción se confirman una por una.</span>
              )}
            </p>
          )}
        </div>
        <Button size="lg" disabled={!canSubmit} onClick={submit}>
          {create.isPending ? "Registrando…" : `Registrar compra · ${formatSoles(totals.stored + (otherCents ?? 0))}`}
        </Button>
      </div>

      {pasteOpen && <PasteRowsDialog onAdd={addPasted} onClose={() => setPasteOpen(false)} />}
    </div>
  );
}
