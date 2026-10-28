"use client";

import { useMemo } from "react";
import { mergeGroups, suggestCovers, type CoverSuggestion } from "@/lib/shortages";
import { useShortages } from "@/modules/shortages/hooks/use-shortages";

/** Faltantes (abiertos o pedidos) que las líneas de esta compra podrían cubrir (spec 019). Solo con permiso de gestionarlos. */
export function useCoverSuggestions(lines: { id: string; name: string }[], enabled: boolean): CoverSuggestion[] {
  const open = useShortages("OPEN", enabled);
  const ordered = useShortages("ORDERED", enabled);
  const key = lines.map((l) => `${l.id}:${l.name}`).join("|");
  return useMemo(
    () => (enabled ? suggestCovers(mergeGroups([...(open.data ?? []), ...(ordered.data ?? [])]), lines) : []),
    // `lines` se vuelve a crear en cada render: su contenido (`key`) es lo que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, open.data, ordered.data, key],
  );
}

export function ShortagesCoverPanel({
  suggestions,
  isChecked,
  onToggle,
}: {
  suggestions: CoverSuggestion[];
  isChecked: (nameKey: string) => boolean;
  onToggle: (nameKey: string, checked: boolean) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <fieldset className="rounded-2xl border bg-success-soft/40 p-5">
      <legend className="px-1 text-sm font-semibold text-success">Faltantes que esta compra podría cubrir</legend>
      <p className="mb-2 text-xs text-muted-foreground">Los marcados pasan a «Recibido» al registrar la compra. Revisa los que no son coincidencia clara.</p>
      <ul className="flex flex-col">
        {suggestions.map(({ group, lineName, checked }) => (
          <li key={group.nameKey}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={isChecked(group.nameKey)} onChange={(e) => onToggle(group.nameKey, e.target.checked)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{group.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  Línea: {lineName}
                  {!checked && " · coincidencia dudosa"}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                x {group.totalQuantity} · {group.timesRequested} {group.timesRequested === 1 ? "pedido" : "pedidos"}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
