"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shrinkImage } from "@/lib/image";

/** Elige o toma una foto (cámara en el celular, galería si se prefiere) y la entrega ya reducida. */
export function PhotoButton({ label, disabled, onPick }: { label: string; disabled?: boolean; onPick: (photo: Blob) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={input}
        aria-hidden="true"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            onPick(await shrinkImage(file));
          } catch {
            toast.error("No se pudo leer la foto; prueba con otra");
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => input.current?.click()}>
        <Camera className="size-4" aria-hidden="true" />
        {busy ? "Preparando…" : label}
      </Button>
    </>
  );
}
