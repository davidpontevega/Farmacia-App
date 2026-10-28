// Faltantes (spec 017): reglas puras. Sin red ni base de datos.
import { autoMatch, bestMatches } from "./match";
import { toCsv as sheetCsv } from "./reports";
import { normalize } from "./text";

export const SHORTAGE_NAME_MAX = 120;
export const SHORTAGE_BATCH_MAX = 30;
export const SHORTAGE_DEDUPE_MINUTES = 10;

export type ShortageSource = "PRESCRIPTION" | "MANUAL" | "SEARCH";
export type ShortageStatus = "OPEN" | "ORDERED" | "DISMISSED" | "RECEIVED";

/** Clave para agrupar: sin tildes ni mayúsculas y con espacios simples. */
export const shortageKey = (name: string) => normalize(name);

/** Anotar a mano exige `shortages.update`; desde una receta o desde la búsqueda de caja basta con `shortages.create`. */
export const canAddSource = (source: ShortageSource, permissions: readonly string[]) =>
  source !== "MANUAL" || permissions.includes("shortages.update");

/** Desde cuándo un mismo ítem del mismo usuario se considera repetido. */
export const dedupeSince = (now: Date) => new Date(now.getTime() - SHORTAGE_DEDUPE_MINUTES * 60_000);

export type ShortageGroup = {
  nameKey: string;
  name: string;
  timesRequested: number;
  totalQuantity: number;
  lastAt: string;
  lastBy: string;
  /** Cuándo y quién lo marcó (Pedido, Descartado o Recibido); nulos mientras está abierto. */
  resolvedAt: string | null;
  resolvedBy: string | null;
};

/** Texto para pegar en un mensaje: una línea por medicamento. */
export const toClipboardText = (rows: readonly ShortageGroup[]) => rows.map((r) => `${r.name} — ${r.totalQuantity}`).join("\n");

/** CSV para Excel: mismo formato que los reportes (UTF-8 con BOM, columnas separadas por «;», fórmulas neutralizadas). */
export const toCsv = (rows: readonly ShortageGroup[]) =>
  sheetCsv(
    ["Medicamento", "Veces pedido", "Cantidad total", "Último pedido"],
    rows.map((r) => [r.name, r.timesRequested, r.totalQuantity, r.lastAt.slice(0, 10)]),
  );

/** Debajo de esta puntuación una línea de compra no se ofrece como cobertura de un faltante. */
export const COVER_MIN_SCORE = 0.3;

export type CoverSuggestion = {
  group: ShortageGroup;
  /** Nombre de la línea de compra que coincide. */
  lineName: string;
  /** Coincidencia clara (números compatibles y bien por delante): llega marcada; la dudosa, desmarcada. */
  checked: boolean;
};

/**
 * Faltantes que una compra podría cubrir, según los productos de sus líneas. Mismo emparejado que Compras y Receta:
 * 250 mg no cubre un faltante de 500 mg por sí solo (aparece, pero desmarcado).
 */
export function suggestCovers(groups: readonly ShortageGroup[], lines: readonly { id: string; name: string }[]): CoverSuggestion[] {
  const catalog = lines.map((l) => ({ id: l.id, commercialName: l.name, genericName: null, laboratory: null }));
  return groups.flatMap((group): CoverSuggestion[] => {
    const clear = autoMatch(group.name, catalog);
    if (clear) return [{ group, lineName: clear.product.commercialName, checked: true }];
    const best = bestMatches(group.name, catalog, 1)[0];
    return best && best.score >= COVER_MIN_SCORE ? [{ group, lineName: best.product.commercialName, checked: false }] : [];
  });
}

/** Un mismo nombre puede tener pedidos abiertos y pedidos ya marcados: se muestra una sola fila con la suma. */
export function mergeGroups(groups: readonly ShortageGroup[]): ShortageGroup[] {
  const byKey = new Map<string, ShortageGroup>();
  for (const g of groups) {
    const prev = byKey.get(g.nameKey);
    byKey.set(
      g.nameKey,
      prev
        ? {
            ...(g.lastAt > prev.lastAt ? g : prev), // fecha y cajero del pedido más reciente, juntos
            timesRequested: prev.timesRequested + g.timesRequested,
            totalQuantity: prev.totalQuantity + g.totalQuantity,
          }
        : g,
    );
  }
  return [...byKey.values()];
}
