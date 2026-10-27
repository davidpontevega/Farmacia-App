// Receta asistida (spec 015): de texto libre a líneas con cantidad y candidatos del catálogo. Puro, sin red.
import { autoMatch, bestMatches, tokens, type CatalogName } from "./match";

export const MAX_PRESCRIPTION_LINES = 30;
export const MAX_QUANTITY = 9999;

export type PrescriptionLine = {
  /** Texto original de la línea, para mostrarlo tal cual lo escribió el cajero. */
  raw: string;
  /** Lo que se busca en el catálogo: la línea sin la cantidad. */
  description: string;
  quantity: number;
};

// «x 21» o «#21» al final (admite «x 14 cápsulas»); o un número solo al inicio que no sea una concentración («2 paracetamol», no «500 mg …»).
const TRAILING_QTY = /\s*(?:\bx|#)\s*(\d{1,4})(?:\s*(?:tab|c[aá]ps|amp|comp|und|sob|gotas?)\p{L}*\.?)?\s*$/iu;
const LEADING_QTY = /^(\d{1,4})\s+(?!(?:mg|ml|g|gr|ui|mcg|cc)\b)(?=\p{L})/iu;

export function parseLine(raw: string): PrescriptionLine | null {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return null;
  let description = text;
  let quantity = 1;

  const trailing = TRAILING_QTY.exec(description);
  if (trailing) {
    quantity = Number(trailing[1]);
    description = description.slice(0, trailing.index).trim();
  } else {
    const leading = LEADING_QTY.exec(description);
    if (leading) {
      quantity = Number(leading[1]);
      description = description.slice(leading[0].length).trim();
    }
  }
  if (!description) return null; // solo había un número
  return { raw: text, description, quantity: Math.min(Math.max(quantity, 1), MAX_QUANTITY) };
}

export function parsePrescription(text: string): { lines: PrescriptionLine[]; ignored: number } {
  const all = text.split(/\r?\n/).flatMap((l) => parseLine(l) ?? []);
  return { lines: all.slice(0, MAX_PRESCRIPTION_LINES), ignored: Math.max(0, all.length - MAX_PRESCRIPTION_LINES) };
}

// Formas farmacéuticas: «jarabe de ambroxol» se busca por ambroxol, no por jarabe (que coincide con decenas de productos).
const FORMS = new Set(["tableta", "tabletas", "jarabe", "crema", "ampolla", "ampollas", "capsula", "capsulas", "gotas", "solucion", "suspension", "comprimidos", "comprimido", "gel", "pomada", "sobres", "inyectable"]);

/** Palabra con la que se pide el catálogo: la primera con letras y 4 o más caracteres que no sea una forma (el principio activo o la marca). */
export function mainTerm(description: string): string | null {
  return tokens(description).find((t) => t.length >= 4 && /[a-z]/.test(t) && !FORMS.has(t)) ?? null;
}

export type RankedLine<P> = {
  candidates: P[];
  /** Solo con coincidencia clara y stock vendible; si no, el cajero elige. */
  suggestedId: string | null;
};

export function rankLine<P extends CatalogName & { sellableStock: number }>(description: string, catalog: P[]): RankedLine<P> {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const candidates = bestMatches(description, catalog, 3).flatMap((m) => byId.get(m.product.id) ?? []);
  const clear = autoMatch(description, catalog);
  const suggested = clear ? byId.get(clear.product.id) : undefined;
  return { candidates, suggestedId: suggested && suggested.sellableStock > 0 ? suggested.id : null };
}
