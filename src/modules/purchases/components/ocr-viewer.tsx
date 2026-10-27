"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OcrRead } from "./ocr-quote-panel";

type Props = {
  readId: string;
  pages: OcrRead["pages"];
  /** `lectura:página:ítem` de la fila enfocada en la tabla. */
  focusRef: string | null;
  onClose: () => void;
};

export function OcrViewer({ readId, pages, focusRef, onClose }: Props) {
  const [zoom, setZoom] = useState(100);
  const band = useRef<HTMLDivElement>(null);
  const [id, pageText, nText] = focusRef ? focusRef.split(":") : [];
  const mine = id === readId;
  const [page, n] = mine ? [Number(pageText), Number(nText)] : [-1, -1];

  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    band.current?.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  }, [focusRef]);

  return (
    <section aria-label="Documento leído" className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b p-3 text-sm">
        <span className="font-semibold">{mine ? `Documento · ítem ${n}` : "Documento"}</span>
        <Button type="button" size="icon" variant="outline" className="size-9" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
          −
        </Button>
        <span className="w-10 text-center tabular-nums">{zoom}%</span>
        <Button type="button" size="icon" variant="outline" className="size-9" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(300, z + 25))}>
          +
        </Button>
        <Button type="button" size="xs" variant="ghost" className="ml-auto" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <p className="sr-only" role="status">
        {mine ? `Fila ${n} resaltada en la página ${page + 1}` : ""}
      </p>
      <div className="max-h-[70vh] overflow-auto bg-muted p-3">
        {pages.map((p, i) => {
          const b = i === page ? p.bands.find((x) => x.n === n) : undefined;
          return (
            <div key={p.url} className="relative mx-auto mb-2" style={{ width: `${zoom}%` }}>
              {/* Imagen local (blob:) del documento: no hay nada que optimizar. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Página ${i + 1} del documento`} className="block w-full bg-white shadow-md" />
              {b && (
                <div
                  ref={band}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 border-y-2 border-warning-ring bg-warning-ring/25"
                  style={{ top: `${b.top * 100}%`, height: `${(b.bottom - b.top) * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
