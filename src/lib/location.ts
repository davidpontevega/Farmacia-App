export const MAX_LOCATION_PART = 20;

/** Texto corto sin caracteres de control (los espacios de los extremos los quita el esquema). */
export const isLocationPart = (v: string) => v.length <= MAX_LOCATION_PART && !/[\u0000-\u001f\u007f]/.test(v);

/** «Estante 3 · Fila 2»; con una sola parte, solo esa; sin datos, null (no se muestra nada). */
export function formatLocation(shelf: string | null | undefined, row: string | null | undefined): string | null {
  const s = shelf?.trim();
  const r = row?.trim();
  const parts = [s ? `Estante ${s}` : null, r ? `Fila ${r}` : null].filter((p): p is string => p !== null);
  return parts.length ? parts.join(" · ") : null;
}
