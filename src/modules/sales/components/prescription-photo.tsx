"use client";

import axios from "axios";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/axios";
import { cropAndShrink } from "@/lib/image";
import { cropError, type Crop } from "@/lib/prescription-read";
import { useReadPrescription } from "../hooks/use-sales";

const CENTER: Crop = { x: 0.15, y: 0.2, w: 0.7, h: 0.6 };
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Foto de la receta → recorte obligatorio → lectura. Solo el recorte sale del equipo (spec 016).
 * Entrega las líneas leídas y una miniatura del recorte para compararlas.
 */
export function PrescriptionPhoto({ onRead, onCancel }: { onRead: (lines: string[], thumbUrl: string) => void; onCancel: () => void }) {
  const read = useReadPrescription();
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  // La URL temporal de la foto se libera al cambiar de foto y al cerrar.
  const current = useRef<string | null>(null);
  useEffect(() => () => { if (current.current) URL.revokeObjectURL(current.current); }, []);
  const choose = (file: File | null) => {
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = file ? URL.createObjectURL(file) : null;
    setPhoto(file && current.current ? { file, url: current.current } : null);
    setCrop(null);
    setAttested(false);
  };

  const point = (e: React.PointerEvent) => {
    const r = frame.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
  };
  const drag = (e: React.PointerEvent) => {
    if (!start.current) return;
    const p = point(e);
    setCrop({ x: Math.min(start.current.x, p.x), y: Math.min(start.current.y, p.y), w: Math.abs(p.x - start.current.x), h: Math.abs(p.y - start.current.y) });
  };

  const problem = cropError(crop);
  const ready = !problem && attested && !sending;

  const send = async () => {
    if (!photo || !crop || !ready) return;
    setSending(true);
    setError(null);
    abort.current = new AbortController();
    try {
      const blob = await cropAndShrink(photo.file, crop);
      const lines = await read.mutateAsync({ crop: blob, signal: abort.current.signal });
      onRead(lines, URL.createObjectURL(blob));
    } catch (err) {
      if (!axios.isCancel(err)) setError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p role="note" className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
        Piloto: la imagen recortada se envía a Google (plan gratuito) para leerla. No incluyas datos del paciente.
      </p>

      {!photo ? (
        <div className="flex flex-col items-start gap-2">
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-hidden="true"
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => {
              choose(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <Button type="button" size="lg" autoFocus onClick={() => picker.current?.click()}>
            <Camera className="size-4" aria-hidden="true" />
            Elegir foto de la receta
          </Button>
          <p className="text-xs text-muted-foreground">Desde el celular abre la cámara o la galería. JPEG, PNG o WebP.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">Dibuja un rectángulo solo sobre la lista de medicamentos (arrastra con el dedo o el mouse).</p>
          <div className="flex justify-center">
          {/* El marco mide lo mismo que la foto: las fracciones del recorte se calculan sobre ella, no sobre el espacio libre. */}
          <div
            ref={frame}
            className="relative w-fit max-w-full touch-none select-none overflow-hidden rounded-lg border"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              start.current = point(e);
              setCrop(null);
            }}
            onPointerMove={drag}
            onPointerUp={() => (start.current = null)}
            onPointerCancel={() => (start.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) del recorte */}
            <img src={photo.url} alt="Foto de la receta para recortar" draggable={false} className="block max-h-[40vh] w-auto max-w-full" />
            {crop && crop.w > 0 && crop.h > 0 && (
              <div className="pointer-events-none absolute border-2 border-primary bg-primary/10" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }} />
            )}
          </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCrop(CENTER)}>
              Recortar al centro
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCrop(null)}>
              Quitar recorte
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => choose(null)}>
              Otra foto
            </Button>
            <p role="status" className={`text-xs ${problem ? "text-warning" : "text-success"}`}>
              {problem ?? "Recorte válido"}
            </p>
          </div>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
            El recorte no incluye nombre ni datos del paciente
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            abort.current?.abort();
            onCancel();
          }}
        >
          {sending ? "Cancelar lectura" : "Volver"}
        </Button>
        {photo && (
          <Button type="button" disabled={!ready} onClick={send}>
            {sending ? "Leyendo receta…" : "Leer receta"}
          </Button>
        )}
      </div>
    </div>
  );
}
