"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DocumentInfo } from "@/lib/ocr/document";
import { OcrCancelled, OcrEngineError, OcrLayoutError, readQuotePage, type PageBand } from "@/lib/ocr/engine";
import type { OcrRow } from "@/lib/ocr/fix";
import { MAX_PDF_PAGES, openPdf, type PdfSource } from "@/lib/ocr/pdf";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type OcrRead = {
  /** Identifica esta lectura: las filas guardan `id:página:ítem` para resaltarse en su propio visor. */
  id: string;
  fileName: string;
  pages: { url: string; bands: PageBand[] }[];
  rows: { page: number; row: OcrRow }[];
  info: DocumentInfo;
  warnings: string[];
};

type Props = { onRead: (read: OcrRead) => void; again?: boolean };

export function OcrQuotePanel({ onRead, again }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Si se sale de la pantalla a media lectura, se corta el motor y no se entrega nada.
  useEffect(() => () => abort.current?.abort(), []);

  const run = async (file: File) => {
    setError(null);
    const isPdf = file.type === "application/pdf";
    if (!isPdf && !IMAGE_TYPES.includes(file.type)) {
      setError("Solo se aceptan imágenes PNG, JPG o WebP y archivos PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("El archivo pesa más de 15 MB.");
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    const urls: string[] = [];
    let pdf: PdfSource | null = null;
    try {
      setProgress({ done: 0, total: 1, label: "Abriendo el archivo" });
      pdf = isPdf ? await openPdf(file) : null;
      const count = pdf ? pdf.numPages : 1;
      if (count === 0) throw new Error("El PDF no tiene páginas.");
      if (count > MAX_PDF_PAGES) {
        setError(`El PDF tiene ${count} páginas; el máximo es ${MAX_PDF_PAGES}.`);
        return;
      }

      const read: OcrRead = { id: Date.now().toString(36), fileName: file.name, pages: [], rows: [], info: emptyInfo(), warnings: [] };
      let layoutError: OcrLayoutError | null = null;
      for (let i = 0; i < count; i++) {
        const label = count > 1 ? `Página ${i + 1} de ${count}: ` : "";
        const source = pdf ? await pdf.render(i + 1) : await createImageBitmap(file);
        try {
          const page = await readQuotePage(
            source,
            (done, total, step) => setProgress({ done, total, label: label + step }),
            controller.signal,
          );
          const url = URL.createObjectURL(page.image);
          urls.push(url);
          read.pages.push({ url, bands: page.bands });
          read.rows.push(...page.rows.map((row) => ({ page: read.pages.length - 1, row })));
          read.warnings.push(...page.warnings.map((w) => label + w));
          read.info = mergeInfo(read.info, page.info);
        } catch (e) {
          // Una página sin tabla (portada, condiciones) no tira las demás.
          if (!(e instanceof OcrLayoutError)) throw e;
          layoutError = e;
          read.warnings.push(`${label}${e.message}`);
        } finally {
          if (source instanceof ImageBitmap) source.close();
        }
      }
      if (read.pages.length === 0) throw layoutError ?? new OcrLayoutError("No se encontró ninguna tabla.");
      if (controller.signal.aborted) throw new OcrCancelled();
      onRead(read);
    } catch (e) {
      urls.forEach((u) => URL.revokeObjectURL(u));
      if (e instanceof OcrCancelled) return;
      setError(
        e instanceof OcrLayoutError
          ? `${e.message} Usa «Pegar filas» o escribe la tabla a mano.`
          : e instanceof OcrEngineError
            ? e.message
            : "No se pudo leer el archivo. Prueba con otra imagen o usa «Pegar filas».",
      );
    } finally {
      await pdf?.close();
      abort.current = null;
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="sr-only"
        aria-label="Archivo de la cotización"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void run(file);
        }}
      />
      {progress ? (
        <div className="flex items-center gap-2 text-sm" role="status">
          <progress aria-label="Avance de la lectura" className="h-2 w-40 accent-primary" value={progress.done} max={progress.total} />
          <span>{progress.label}…</span>
          <Button type="button" size="sm" variant="outline" onClick={() => abort.current?.abort()}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="h-11 gap-2 px-4 font-semibold" onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" />
          {again ? "Subir otra" : "Leer cotización (imagen o PDF)"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const emptyInfo = (): DocumentInfo => ({
  supplierName: null,
  documentNumber: null,
  documentDate: null,
  subtotalCents: null,
  igvCents: null,
  totalCents: null,
  rowCount: null,
});

/** Lo que la primera página que lo trae define; el total del documento está en la última. */
const mergeInfo = (a: DocumentInfo, b: DocumentInfo): DocumentInfo => ({
  supplierName: a.supplierName ?? b.supplierName,
  documentNumber: a.documentNumber ?? b.documentNumber,
  documentDate: a.documentDate ?? b.documentDate,
  subtotalCents: b.subtotalCents ?? a.subtotalCents,
  igvCents: b.igvCents ?? a.igvCents,
  totalCents: b.totalCents ?? a.totalCents,
  rowCount: (a.rowCount ?? 0) + (b.rowCount ?? 0) || null,
});
