// Diseño de la tabla de un documento leído con OCR: dónde están las columnas y las filas.
// Todo en el sistema de coordenadas de la imagen de trabajo (píxeles).

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type OcrWord = { text: string; confidence: number; bbox: Box };

export const COLUMN_NAMES = ["item", "code", "qty", "um", "desc", "date", "price", "total"] as const;
export type ColumnName = (typeof COLUMN_NAMES)[number];
export type ColumnBounds = Partial<Record<ColumnName, [number, number]>>;

// Rótulos del encabezado: prefijos de la palabra normalizada (sin tildes, solo letras, mayúsculas).
const LABELS: Record<ColumnName, { prefixes: string[]; exact?: string[] }> = {
  item: { prefixes: [], exact: ["ITEM"] },
  code: { prefixes: ["CODIGO", "COD"] },
  qty: { prefixes: ["CANT"] },
  um: { prefixes: [], exact: ["UM", "UNIDAD", "MEDIDA"] },
  desc: { prefixes: ["DESCRIP"] },
  date: { prefixes: ["EXPIRAC", "VENCIM", "VCTO"] },
  price: { prefixes: ["PRECIO"] },
  total: { prefixes: ["TOTAL"] },
};

const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const center = (b: Box) => (b.y0 + b.y1) / 2;
const height = (b: Box) => b.y1 - b.y0;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

function matches(column: ColumnName, word: string) {
  const w = norm(word);
  if (!w) return false;
  const l = LABELS[column];
  return l.prefixes.some((p) => w.startsWith(p)) || (l.exact ?? []).includes(w);
}

/** Agrupa palabras en líneas por la altura de su centro. */
function groupLines(words: OcrWord[]): OcrWord[][] {
  const tol = Math.max(median(words.map((w) => height(w.bbox))) * 0.6, 4);
  const lines: { cy: number; words: OcrWord[] }[] = [];
  for (const w of [...words].sort((a, b) => center(a.bbox) - center(b.bbox))) {
    const cy = center(w.bbox);
    const line = lines.find((l) => Math.abs(l.cy - cy) < tol);
    if (line) {
      line.words.push(w);
      line.cy = line.words.reduce((s, x) => s + center(x.bbox), 0) / line.words.length;
    } else lines.push({ cy, words: [w] });
  }
  return lines.map((l) => l.words.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

export type Header = {
  columns: ColumnBounds;
  /** Borde inferior de la fila de encabezados: ahí empiezan los datos. */
  bottom: number;
  /** Alto típico del texto del encabezado (unidad de medida independiente del tamaño de la imagen). */
  unit: number;
};

/**
 * Busca la línea de encabezados (la que reúne más rótulos de columna) y de ella saca las columnas:
 * cada columna empieza un poco antes del rótulo de la siguiente, porque los datos nunca empiezan
 * a la izquierda de su rótulo. Hacen falta al menos cantidad, precio y total.
 */
export function findHeader(words: OcrWord[]): Header | null {
  let best: { hits: Map<ColumnName, OcrWord>; line: OcrWord[] } | null = null;

  for (const line of groupLines(words)) {
    const hits = new Map<ColumnName, OcrWord>();
    const used = new Set<OcrWord>();
    for (const column of COLUMN_NAMES) {
      const w = line.find((x) => !used.has(x) && matches(column, x.text));
      if (w) {
        hits.set(column, w);
        used.add(w);
      }
    }
    if (!best || hits.size > best.hits.size) best = { hits, line };
  }

  if (!best || best.hits.size < 4 || !best.hits.has("qty") || !best.hits.has("price") || !best.hits.has("total")) {
    return null;
  }

  const hit = [...best.hits.entries()].sort((a, b) => a[1].bbox.x0 - b[1].bbox.x0);
  const unit = median(hit.map(([, w]) => height(w.bbox))) || 10;
  const pad = unit * 0.4;

  const lastWord = hit[hit.length - 1][1];
  // Lo que sigue al último rótulo en la misma línea ("TOTAL S/.") forma parte de su columna.
  const lastRight = Math.max(...best.line.filter((w) => w.bbox.x0 >= lastWord.bbox.x0).map((w) => w.bbox.x1));

  const columns: ColumnBounds = {};
  hit.forEach(([name, w], i) => {
    const left = i === 0 ? w.bbox.x0 - 2 * pad : w.bbox.x0 - pad;
    const right = i === hit.length - 1 ? lastRight + 1.5 * unit : hit[i + 1][1].bbox.x0 - pad;
    columns[name] = [Math.round(left), Math.round(right)];
  });

  return { columns, bottom: Math.max(...hit.map(([, w]) => w.bbox.y1)), unit };
}

export type Anchor = { n: number; y: number };

/**
 * Altura del centro de cada fila 1..count a partir de los números de ítem que sí se leyeron;
 * las filas cuyo número no se leyó se interpolan entre sus vecinas (o se extrapolan con el paso local).
 * Devuelve null si hay menos de 2 anclas o si no son crecientes.
 */
export function rowCenters(anchors: Anchor[], count: number): number[] | null {
  const byN = new Map<number, number>();
  for (const a of [...anchors].sort((x, y) => x.y - y.y)) {
    if (a.n >= 1 && a.n <= count && !byN.has(a.n)) byN.set(a.n, a.y);
  }
  const known = [...byN.entries()].sort((a, b) => a[0] - b[0]);
  if (known.length < 2) return null;
  for (let i = 1; i < known.length; i++) if (known[i][1] <= known[i - 1][1]) return null;

  const pitchBetween = (a: [number, number], b: [number, number]) => (b[1] - a[1]) / (b[0] - a[0]);
  const centers: number[] = [];
  for (let n = 1; n <= count; n++) {
    const exact = byN.get(n);
    if (exact !== undefined) {
      centers.push(exact);
      continue;
    }
    const before = [...known].reverse().find(([k]) => k < n);
    const after = known.find(([k]) => k > n);
    if (before && after) centers.push(before[1] + pitchBetween(before, after) * (n - before[0]));
    else if (!before && after) {
      const next = known.find(([k]) => k > after[0]) ?? after;
      centers.push(after[1] - pitchBetween(after, next === after ? known[0] : next) * (after[0] - n));
    } else if (before && !after) {
      const prev = [...known].reverse().find(([k]) => k < before[0]) ?? before;
      centers.push(before[1] + pitchBetween(prev === before ? known[known.length - 1] : prev, before) * (n - before[0]));
    }
  }
  return centers;
}

/** Paso típico entre filas. */
export const rowPitch = (centers: number[]) =>
  median(centers.slice(1).map((c, i) => c - centers[i]));

/**
 * Reparte lecturas (con su altura `y`) entre las filas: cada una va a la fila de centro más cercano,
 * si está a menos de 0,6 pasos; las que caen fuera (pie de página, totales) se descartan.
 */
export function assignToRows<T extends { y: number }>(items: T[], centers: number[]): T[][] {
  const pitch = rowPitch(centers) || 1;
  const rows: T[][] = centers.map(() => []);
  for (const item of [...items].sort((a, b) => a.y - b.y)) {
    let best = -1;
    let bestDist = Infinity;
    centers.forEach((c, i) => {
      const d = Math.abs(c - item.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (best >= 0 && bestDist <= pitch * 0.6) rows[best].push(item);
  }
  return rows;
}
