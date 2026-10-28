// Emparejar la descripción de un documento con el catálogo, por palabras en común.

const STOPWORDS = new Set(["de", "del", "la", "el", "x", "c", "p", "para", "con", "sol", "iny", "inyec", "oral"]);
// Las unidades se separan del número ("500mg" -> "500", "mg") y se descartan: el número es lo que distingue.
const UNITS = new Set(["mg", "ml", "g", "gr", "ui", "mcg", "kg", "l", "cc"]);

/** Palabras comparables: minúsculas, sin tildes ni puntuación; sin `X 25`, unidades ni conectores. */
export function tokens(text: string): string[] {
  const clean = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // presentación ("X 12", "x01") no identifica al producto
    .replace(/\bx\s*\d+\b/g, " ")
    // "500mg" y "500 mg" deben ser lo mismo
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9.]+/g, " ");
  return clean
    .split(/\s+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t && !STOPWORDS.has(t) && !UNITS.has(t));
}

export type CatalogName = {
  id: string;
  commercialName: string;
  genericName: string | null;
  laboratory: string | null;
  /** Otros nombres con que se pide el producto (spec 020). */
  aliases?: readonly string[];
};

const label = (c: CatalogName) =>
  [c.commercialName, c.genericName, c.laboratory].filter(Boolean).join(" ");

/** 0..1: mitad parecido global (Jaccard), mitad cuántas palabras del catálogo aparecen en la descripción. */
export function score(description: string, candidate: string) {
  const a = new Set(tokens(description));
  const b = new Set(tokens(candidate));
  if (a.size === 0 || b.size === 0) return 0;
  const common = [...b].filter((t) => a.has(t)).length;
  const jaccard = common / (a.size + b.size - common);
  const containment = common / b.size;
  return 0.5 * jaccard + 0.5 * containment;
}

/** `via`: el alias que dio la mejor puntuación, si fue un alias y no la etiqueta habitual del producto. */
export type Match = { product: CatalogName; score: number; via?: string };

/** La mejor puntuación entre la etiqueta del producto y cada alias por separado: los alias extra no diluyen la coincidencia. */
function bestScore(description: string, c: CatalogName): { score: number; via?: string } {
  let top: { score: number; via?: string } = { score: score(description, label(c)) };
  for (const alias of c.aliases ?? []) {
    const s = score(description, alias);
    if (s > top.score) top = { score: s, via: alias };
  }
  return top;
}

export function bestMatches(description: string, catalog: CatalogName[], limit = 3): Match[] {
  return catalog
    .map((product) => ({ product, ...bestScore(description, product) }))
    .filter((m) => m.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

export const AUTO_MATCH_MIN = 0.6;
export const AUTO_MATCH_GAP = 0.1;

const isNumeric = (t: string) => /^\d[\d.]*$/.test(t);

/**
 * La descripción trae concentraciones y volúmenes ("250", "1000"): si el candidato no los tiene
 * todos es otro producto (250 mg no es 500 mg). Se ofrece en el desplegable, pero no se sugiere solo.
 */
function numbersCovered(description: string, candidate: string) {
  const cand = new Set(tokens(candidate));
  return tokens(description).filter(isNumeric).every((n) => cand.has(n));
}

/** La mejor coincidencia solo si es clara: números compatibles y bien por delante de la segunda. */
export function autoMatch(description: string, catalog: CatalogName[]): Match | null {
  const compatible = bestMatches(description, catalog, catalog.length).filter((m) =>
    // Un alias suele venir sin concentración («Ondansetrón»): los números se buscan en la etiqueta y en el alias juntos.
    numbersCovered(description, `${label(m.product)} ${m.via ?? ""}`),
  );
  const [best, second] = compatible;
  if (!best || best.score < AUTO_MATCH_MIN) return null;
  if (second && best.score - second.score < AUTO_MATCH_GAP) return null;
  return best;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Búsqueda mientras se escribe: cada palabra escrita debe aparecer (incluso parcial) en el nombre. */
export function searchByTerm(term: string, catalog: CatalogName[], limit = 6): CatalogName[] {
  const words = fold(term).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return catalog
    .map((c) => ({ c, text: fold([label(c), ...(c.aliases ?? [])].join(" ")) }))
    .filter(({ text }) => words.every((w) => text.includes(w)))
    .sort((a, b) => a.text.indexOf(words[0]) - b.text.indexOf(words[0]) || a.text.length - b.text.length)
    .slice(0, limit)
    .map(({ c }) => c);
}
