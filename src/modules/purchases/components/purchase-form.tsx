"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
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
import { isShippingLine } from "@/lib/ocr/document";
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
  rowFromOcr,
  rowFromPasted,
  rowIssues,
  rowStatus,
  rowsTotals,
  type Header,
  type PurchaseRow,
} from "../rows";
import type { SupplierLink } from "../types";
import { OcrQuotePanel, type OcrRead } from "./ocr-quote-panel";
import { OcrViewer } from "./ocr-viewer";
import { PasteRowsDialog } from "./paste-rows-dialog";
import { PurchaseHeader } from "./purchase-header";
import { PurchaseRowView } from "./purchase-row";
import { ShortagesCoverPanel, useCoverSuggestions } from "./shortages-cover-panel";

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
  const { userId, can } = usePermissions();
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
  const [ocr, setOcr] = useState<{ id: string; fileName: string; pages: OcrRead["pages"]; rowCount: number; shippingCents: number; notes: string[] } | null>(null);
  const [focusRef, setFocusRef] = useState<string | null>(null);
  // Faltantes que el usuario desmarcó o marcó a mano (lo demás sigue la sugerencia).
  const [coverOverrides, setCoverOverrides] = useState<Record<string, boolean>>({});

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
        uncertain: undefined,
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

  // Las imágenes del documento viven solo en memoria: se liberan al cerrar el visor o la página.
  useEffect(() => {
    const pages = ocr?.pages;
    return () => pages?.forEach((p) => URL.revokeObjectURL(p.url));
  }, [ocr]);

  // La lectura dura decenas de segundos: addOcr debe ver el catálogo y los vínculos de ahora, no los de cuando se eligió el archivo.
  const latest = useRef({ links, catalog, header, documentTotal });
  useEffect(() => {
    latest.current = { links, catalog, header, documentTotal };
  });

  const closeOcr = () => {
    setOcr(null);
    setFocusRef(null);
    setRows((prev) => prev.map((r) => (r.ocrRef ? { ...r, ocrRef: undefined } : r)));
  };

  const addOcr = (read: OcrRead) => {
    const { links: nowLinks, catalog: nowCatalog, header: nowHeader, documentTotal: nowTotal } = latest.current;
    // El envío y el flete son un cargo del documento, no un producto: van a «Otros gastos».
    const isShipping = ({ row }: OcrRead["rows"][number]) => !row.expiry && isShippingLine(row.description);
    const shippingCents = read.rows
      .filter(isShipping)
      .reduce((sum, { row }) => sum + (isValidSoles(row.total || row.price) ? toCents(row.total || row.price) : 0), 0);
    const added = read.rows
      .filter((r) => !isShipping(r))
      .map(({ page, row }) => rowFromOcr(row, `${read.id}:${page}:${row.n}`, nowLinks, nowCatalog));
    setRows((prev) => [...(prev.length === 1 && isBlankRow(prev[0]) ? [] : prev), ...added]);

    // Datos del documento: solo donde no hay nada escrito (la fecha de hoy es el valor por defecto,
    // no algo que la persona eligiera), y el aviso nombra solo lo que se aplicó.
    const { info } = read;
    const patch: Partial<Header> = {};
    const applied: string[] = [];
    const notes: string[] = [];
    if (!nowHeader.supplier.trim() && info.supplierName) {
      patch.supplier = info.supplierName;
      applied.push("proveedor");
    }
    if (shippingCents > 0) {
      if (nowHeader.otherCharges.trim()) {
        notes.push(`El documento trae envío por ${formatSoles(shippingCents)} y no se aplicó porque ya hay «Otros gastos».`);
      } else {
        patch.otherCharges = centsToInput(shippingCents);
        applied.push(`otros gastos (envío ${formatSoles(shippingCents)})`);
      }
    }
    if (!nowHeader.documentNumber.trim() && info.documentNumber) {
      patch.documentNumber = info.documentNumber;
      applied.push("número");
    }
    if ((!nowHeader.documentDate || nowHeader.documentDate === today) && info.documentDate && info.documentDate <= today) {
      patch.documentDate = info.documentDate;
      applied.push("fecha");
    }
    if (Object.keys(patch).length) setHeader((h) => ({ ...h, ...patch }));
    if (!nowTotal.trim() && info.totalCents !== null) {
      setDocumentTotal(centsToInput(info.totalCents));
      applied.push("total");
    }
    setFocusRef(null);
    setOcr({
      id: read.id,
      fileName: read.fileName,
      pages: read.pages,
      rowCount: added.length,
      shippingCents: patch.otherCharges ? shippingCents : 0,
      notes: [
        ...(applied.length ? [`Leído del documento (verifica): ${applied.join(", ")}.`] : []),
        ...notes,
        ...read.warnings,
      ],
    });
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
  const coverLines = filled.map((r) => ({ id: r.key, name: r.isNew ? r.description : r.productName })).filter((l) => l.name.trim());
  const covers = useCoverSuggestions(coverLines, can("shortages.read") && can("shortages.update"));
  const isCovered = (nameKey: string) => coverOverrides[nameKey] ?? covers.find((s) => s.group.nameKey === nameKey)?.checked ?? false;
  const coversShortages = covers.filter((s) => isCovered(s.group.nameKey)).map((s) => s.group.nameKey);
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

  const doubtfulFields = effective.reduce((n, r) => n + (r.ocrRef && !r.confirmed ? (r.uncertain?.length ?? 0) : 0), 0);

  const reset = () => {
    setRows([emptyRow()]);
    setHeader(initialHeader());
    setDocumentTotal("");
    setMargin("");
    setOcr(null);
    setCoverOverrides({});
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
    create.mutate({ ...buildPayload(header, filled), ...(coversShortages.length > 0 ? { coversShortages } : {}) }, { onSuccess: reset });

  const card = "card-surface p-5";
  const linesLabel = `${filled.length} ${filled.length === 1 ? "fila" : "filas"}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 px-5 font-semibold"
          onClick={() => {
            if ((filled.length === 0 && ocr === null && isEmptyDraft(draft)) || window.confirm("¿Descartar esta compra? Se perderán las filas y el documento leído.")) reset();
          }}
        >
          Cancelar
        </Button>
        <Button type="button" className="h-11 px-5 font-semibold" disabled={!canSubmit} onClick={submit}>
          {create.isPending ? "Registrando…" : `Registrar compra · ${formatSoles(totals.stored + (otherCents ?? 0))}`}
        </Button>
      </div>

      {stored && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning-ring/40 bg-warning-soft p-3 text-sm text-warning">
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
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
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
        fromDocument={ocr !== null}
      />

      <section className={`${card} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Leer cotización con foto o PDF</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sube la cotización limpia que te envía el proveedor. Se lee en tu navegador y la imagen no sale de tu equipo.
            </p>
          </div>
          <OcrQuotePanel onRead={addOcr} again={ocr !== null} />
        </div>

        {ocr && (
          <>
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-success-soft px-4 py-3 text-success">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold">
                Lectura terminada · {ocr.fileName} · {ocr.pages.length} {ocr.pages.length === 1 ? "página" : "páginas"} · {ocr.rowCount} {ocr.rowCount === 1 ? "fila" : "filas"}
              </span>
              <span className="h-2 min-w-24 flex-1 rounded-full bg-success/20" aria-hidden="true">
                <span className="block h-2 w-full rounded-full bg-chart-2" />
              </span>
              <span className="text-sm tabular-nums">100%</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {doubtfulFields > 0 && (
                <div role="status" className="flex min-w-64 flex-1 gap-3 rounded-xl bg-warning-soft p-3 text-sm leading-relaxed text-warning">
                  <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
                  <p>
                    <strong>Revisa {doubtfulFields} {doubtfulFields === 1 ? "campo" : "campos"} en ámbar.</strong> El sistema no estaba seguro de la lectura; al corregirlos se quita la marca.
                  </p>
                </div>
              )}
              {ocr.shippingCents > 0 && (
                <div role="status" className="flex min-w-64 flex-1 gap-3 rounded-xl bg-secondary p-3 text-sm leading-relaxed text-secondary-foreground">
                  <Info className="size-5 shrink-0" aria-hidden="true" />
                  <p>
                    <strong>Flete {formatSoles(ocr.shippingCents)}</strong> pasó a «Otros gastos»: no es un producto y no entra al inventario.
                  </p>
                </div>
              )}
            </div>
            {ocr.notes.length > 0 && (
              <ul role="status" className="rounded-xl border border-warning-ring/40 bg-warning-soft p-3 text-sm text-warning">
                {ocr.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          {ocr && (
            <div className="xl:sticky xl:top-4">
              <OcrViewer readId={ocr.id} pages={ocr.pages} focusRef={focusRef} onClose={closeOcr} />
            </div>
          )}
          <div className={`flex min-w-0 flex-col gap-3 ${ocr ? "" : "xl:col-span-2"}`}>
            <div className="flex flex-wrap items-end gap-2">
              <Button type="button" variant="outline" className="h-10" onClick={() => setPasteOpen(true)}>
                Pegar filas
              </Button>
              <Button type="button" variant="outline" className="h-10" onClick={addRow}>
                + Agregar fila
              </Button>
              <Button type="button" variant="outline" className="h-10" onClick={createUnmatchedAsNew}>
                Crear como nuevos los que no tienen producto
              </Button>
              <div className="ml-auto flex items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="margin" className="text-xs">
                    Margen % para productos nuevos
                  </Label>
                  <Input id="margin" className="h-10 w-24" inputMode="decimal" placeholder="Ej: 30" value={margin} onChange={(e) => setMargin(e.target.value)} />
                </div>
                <Button type="button" variant="outline" className="h-10" disabled={!marginOk} onClick={applyMargin}>
                  Sugerir precios
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {COLUMNS.map((c, i) => (
                      <TableHead key={i} className="whitespace-nowrap px-1 text-xs font-medium text-muted-foreground">
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
                      onFocusRow={setFocusRef}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-3.5 rounded border-2 border-warning-ring bg-warning-soft" aria-hidden="true" />
              Campo en ámbar: lectura dudosa, revisar. Haz clic en una fila para verla resaltada en el documento.
            </p>
          </div>
        </div>
      </section>

      <section className={`${card} flex flex-col gap-2 text-sm sm:ml-auto sm:w-full sm:max-w-md`}>
        <div className="flex justify-between text-muted-foreground">
          <span>Productos ({linesLabel})</span>
          <span className="tabular-nums">{formatSoles(totals.documentLines)}</span>
        </div>
        {otherCents ? (
          <div className="flex justify-between text-muted-foreground">
            <span>Otros gastos</span>
            <span className="tabular-nums">{formatSoles(otherCents)}</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="font-semibold">Total de la compra</span>
          <span className="text-2xl font-bold tabular-nums">{formatSoles(balance.expected)}</span>
        </div>
        {balance.diff !== null && (
          <p className={balance.diff === 0 ? "flex items-center gap-2 text-xs font-semibold text-success" : "text-xs font-semibold text-destructive"} role="status">
            {balance.diff === 0 ? (
              <>
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Coincide con el total del documento
              </>
            ) : (
              `No cuadra con el total del documento: diferencia ${formatSolesSigned(balance.diff)}`
            )}
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
          <p className="text-warning">
            {warningCount} fila(s) con avisos por confirmar.{" "}
            <button type="button" className="underline" onClick={confirmWarnings}>
              Confirmar los avisos que no son sugerencias
            </button>
            {suggestedPending > 0 && <span> Las {suggestedPending} sugerencia(s) por descripción se confirman una por una.</span>}
          </p>
        )}
      </section>

      <ShortagesCoverPanel suggestions={covers} isChecked={isCovered} onToggle={(k, v) => setCoverOverrides((o) => ({ ...o, [k]: v }))} />

      {pasteOpen && <PasteRowsDialog onAdd={addPasted} onClose={() => setPasteOpen(false)} />}
    </div>
  );
}
