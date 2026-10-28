"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { aliasesError, cleanAlias, MAX_ALIASES } from "@/lib/aliases";

/** Nombres alternativos: se escribe uno y Enter o coma lo añade; cada uno se quita con su botón. */
export function AliasesInput({ id, value, commercialName, onChange }: { id: string; value: string[]; commercialName: string; onChange: (aliases: string[]) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    // Pegar «Zofran, Vomistop» añade los dos.
    const parts = text.split(",").map(cleanAlias).filter(Boolean);
    if (parts.length === 0) return;
    // Se valida la lista que quedaría: tope, largo, repetidos y distinto del nombre comercial.
    const next = [...value, ...parts];
    const problem = aliasesError(next, commercialName);
    if (problem) return setError(problem);
    setError(null);
    onChange(next);
    setText("");
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Nombres alternativos">
          {value.map((alias) => (
            <li key={alias} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-xs text-secondary-foreground">
              {alias}
              <button type="button" aria-label={`Quitar «${alias}»`} className="flex size-6 items-center justify-center rounded-full hover:bg-background" onClick={() => onChange(value.filter((a) => a !== alias))}>
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={text}
        disabled={value.length >= MAX_ALIASES}
        placeholder={value.length >= MAX_ALIASES ? `Máximo ${MAX_ALIASES}` : "Ej: Ondansetrón (Enter para añadir)"}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault(); // Enter no debe enviar el formulario del producto
            add();
          }
        }}
        onBlur={add}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
