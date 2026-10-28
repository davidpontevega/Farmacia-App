// Faltantes (spec 017): reglas puras. Sin red ni base de datos.
import { normalize } from "./text";

export const SHORTAGE_NAME_MAX = 120;
export const SHORTAGE_BATCH_MAX = 30;
export const SHORTAGE_DEDUPE_MINUTES = 10;

export type ShortageSource = "PRESCRIPTION" | "MANUAL";
export type ShortageStatus = "OPEN" | "ORDERED" | "DISMISSED";

/** Clave para agrupar: sin tildes ni mayúsculas y con espacios simples. */
export const shortageKey = (name: string) => normalize(name);

/** Anotar a mano exige `shortages.update`; las que vienen de una receta basta con `shortages.create`. */
export const canAddSource = (source: ShortageSource, permissions: readonly string[]) =>
  source === "PRESCRIPTION" || permissions.includes("shortages.update");

/** Desde cuándo un mismo ítem del mismo usuario se considera repetido. */
export const dedupeSince = (now: Date) => new Date(now.getTime() - SHORTAGE_DEDUPE_MINUTES * 60_000);

export type ShortageGroup = {
  nameKey: string;
  name: string;
  timesRequested: number;
  totalQuantity: number;
  lastAt: string;
  lastBy: string;
};

/** Texto para pegar en un mensaje: una línea por medicamento. */
export const toClipboardText = (rows: readonly ShortageGroup[]) => rows.map((r) => `${r.name} — ${r.totalQuantity}`).join("\n");

// Excel interpreta como fórmula lo que empieza con = + - @ (o tabulación / retorno): el nombre es texto libre o de una IA.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number): string {
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: readonly ShortageGroup[]): string {
  const header = ["Medicamento", "Veces pedido", "Cantidad total", "Último pedido"];
  const lines = rows.map((r) => [r.name, r.timesRequested, r.totalQuantity, r.lastAt.slice(0, 10)].map(csvCell).join(","));
  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}
