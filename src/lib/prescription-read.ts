// Lectura de recetas por foto (spec 016): reglas puras. Nada de red ni de base de datos.
export const READ_MAX_LINES = 30;
export const READ_MAX_LINE_CHARS = 120;
export const READ_MAX_BYTES = 1024 * 1024;
export const READ_MAX_SIDE = 1280;
export const READ_LIMIT = 15;
export const READ_WINDOW_MINUTES = 10;
export const CROP_MIN_AREA = 0.1;
export const CROP_MAX_AREA = 0.7;

/** Rectángulo en fracciones de la foto (0..1). */
export type Crop = { x: number; y: number; w: number; h: number };

/** Motivo por el que el recorte no sirve, o null. El recorte debe dejar fuera el resto de la receta, no ser la foto entera. */
export function cropError(c: Crop | null): string | null {
  if (!c) return "Dibuja un recorte sobre los medicamentos";
  const values = [c.x, c.y, c.w, c.h];
  if (values.some((v) => !Number.isFinite(v))) return "Recorte inválido";
  if (c.x < 0 || c.y < 0 || c.w <= 0 || c.h <= 0 || c.x + c.w > 1.0001 || c.y + c.h > 1.0001) return "El recorte se sale de la foto";
  const area = c.w * c.h;
  if (area < CROP_MIN_AREA) return "El recorte es muy pequeño";
  if (area > CROP_MAX_AREA) return "El recorte es muy grande: deja fuera lo que no sean medicamentos";
  return null;
}

// Caracteres de control (salvo tabulación y salto) no tienen sentido en una línea de receta.
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/;

/**
 * Interpreta la respuesta del modelo: JSON `{ "lines": string[] }` o, si se coló texto alrededor, el primer objeto JSON.
 * Devuelve líneas limpias (máximo 30, de hasta 120 caracteres) o null si la respuesta no se entiende.
 */
export function parseReadLines(output: string): string[] | null {
  let data: unknown;
  try {
    data = JSON.parse(output);
  } catch {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      data = JSON.parse(output.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  const lines = (data as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines)) return null;
  return lines
    .filter((l): l is string => typeof l === "string")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && l.length <= READ_MAX_LINE_CHARS && !CONTROL.test(l))
    .slice(0, READ_MAX_LINES);
}

/** Línea con lectura dudosa: el modelo marcó con «?» lo que no pudo leer. */
export const isUncertainLine = (line: string) => line.includes("?");

/** Desde cuándo se cuentan las lecturas del usuario. */
export const readWindowStart = (now: Date) => new Date(now.getTime() - READ_WINDOW_MINUTES * 60_000);

export const readLimitReached = (recentReads: number) => recentReads >= READ_LIMIT;
