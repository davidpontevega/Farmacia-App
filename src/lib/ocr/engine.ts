// Motor de OCR del navegador: lee una página de cotización columna por columna con Tesseract.js.
// Nada sale del navegador; el idioma se descarga una vez y el navegador lo conserva.
import { createWorker, PSM, type Worker } from "tesseract.js";
import { todayLima } from "../dates";
import { readDocumentInfo, type DocumentInfo } from "./document";
import { buildOcrRow, type OcrRow, type RowReads } from "./fix";
import {
  assignToRows,
  findHeader,
  rowCenters,
  rowPitch,
  type ColumnName,
  type OcrWord,
} from "./layout";

const WORK_WIDTH = 2400;
const PAD = 12;

const WHITELIST: Record<Exclude<ColumnName, "item">, string> = {
  code: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  qty: "0123456789",
  um: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  desc: "", // sin restricción: las descripciones llevan letras, números y símbolos
  date: "0123456789/",
  price: "0123456789.,",
  total: "0123456789.,",
};

export type PageBand = { n: number; top: number; bottom: number };
export type PageResult = {
  rows: OcrRow[];
  info: DocumentInfo;
  /** Franja vertical de cada fila, como fracción (0..1) del alto de la imagen. */
  bands: PageBand[];
  image: Blob;
  warnings: string[];
};

export class OcrCancelled extends Error {}
export class OcrLayoutError extends Error {}
export class OcrEngineError extends Error {}

/** Tesseract no rechaza lo pendiente al terminar el worker: se corta la espera al cancelar. */
function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new OcrCancelled());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new OcrCancelled());
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

type Progress = (done: number, total: number, label: string) => void;

function toCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Lleva la imagen a un ancho de trabajo fijo, en gris y con el contraste estirado. */
export function prepare(source: ImageBitmap | HTMLCanvasElement): HTMLCanvasElement {
  const scale = WORK_WIDTH / source.width;
  const c = toCanvas(source.width * scale, source.height * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000);
    d[i] = d[i + 1] = d[i + 2] = g;
    hist[g]++;
  }
  // Contraste estirado entre los percentiles 1 y 99: un encabezado oscuro con letras claras no se pierde.
  const pixels = d.length / 4;
  const percentile = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= pixels * q) return v;
    return 255;
  };
  const lo = percentile(0.01);
  const span = Math.max(percentile(0.99) - lo, 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = Math.min(255, Math.max(0, ((d[i] - lo) * 255) / span));
  }
  removeLines(d, c.width, c.height);
  ctx.putImageData(img, 0, 0);
  return c;
}

const DARK = 170;
const MIN_LINE = 90;

/** Blanquea las rayas largas (bordes de la tabla): pegadas al texto, Tesseract lo toma por un gráfico. */
function removeLines(d: Uint8ClampedArray, w: number, h: number) {
  const erase = (start: number, step: number, len: number) => {
    let run = 0;
    for (let i = 0; i <= len; i++) {
      const dark = i < len && d[start + i * step] < DARK;
      if (dark) run++;
      else {
        if (run >= MIN_LINE) {
          for (let k = i - run; k < i; k++) {
            const o = start + k * step;
            d[o] = d[o + 1] = d[o + 2] = 255;
          }
        }
        run = 0;
      }
    }
  };
  for (let y = 0; y < h; y++) erase(y * w * 4, 4, w);
  for (let x = 0; x < w; x++) erase(x * 4, w * 4, h);
}

function crop(src: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number) {
  const w = Math.max(1, Math.round(x1 - x0));
  const h = Math.max(1, Math.round(y1 - y0));
  const c = toCanvas(w + 2 * PAD, h + 2 * PAD);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, x0, y0, w, h, PAD, PAD, w, h);
  return c;
}

/** Palabras con su posición en la imagen de trabajo; `at` es la esquina del recorte (con su margen). */
async function words(
  worker: Worker,
  image: HTMLCanvasElement,
  signal: AbortSignal,
  at?: { x: number; y: number },
) {
  const { data } = await untilAborted(worker.recognize(image, {}, { blocks: true, text: true }), signal);
  const dx = at ? at.x - PAD : 0;
  const dy = at ? at.y - PAD : 0;
  const out: OcrWord[] = (data.blocks ?? [])
    .flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)))
    .map((w) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: { x0: w.bbox.x0 + dx, x1: w.bbox.x1 + dx, y0: w.bbox.y0 + dy, y1: w.bbox.y1 + dy },
    }));
  return { words: out, text: data.text };
}

/** Lee una página. `onProgress(hecho, total, etiqueta)` se llama entre pasos. */
export async function readQuotePage(
  source: ImageBitmap | HTMLCanvasElement,
  onProgress: Progress,
  signal: AbortSignal,
): Promise<PageResult> {
  const canvas = prepare(source);
  const steps = 4 + Object.keys(WHITELIST).length;
  let done = 0;
  const tick = (label: string) => {
    if (signal.aborted) throw new OcrCancelled();
    onProgress(done++, steps, label);
  };

  tick("Cargando el motor de lectura");
  const creating = createWorker("spa");
  const worker = await untilAborted(creating, signal).catch((e) => {
    // Si se canceló mientras cargaba, el worker se crea igual: se termina al llegar.
    void creating.then((w) => w.terminate(), () => undefined);
    if (e instanceof OcrCancelled) throw e;
    throw new OcrEngineError("No se pudo cargar el motor de lectura (hace falta internet la primera vez).");
  });
  try {
    const params = (p: Parameters<Worker["setParameters"]>[0]) => untilAborted(worker.setParameters(p), signal);
    await params({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });

    tick("Buscando las columnas");
    const page = await words(worker, canvas, signal);
    const header = findHeader(page.words);
    if (!header) throw new OcrLayoutError("No se encontró la fila de encabezados (ITEM, CANT, PRECIO, TOTAL…).");
    const info = readDocumentInfo(page.text);
    const top = header.bottom + 2;

    tick("Ubicando las filas");
    const itemCol = header.columns.item ?? header.columns.code;
    if (!itemCol) throw new OcrLayoutError("No se encontró la columna de ítems.");
    await params({ tessedit_char_whitelist: "0123456789" });
    const itemRead = await words(worker, crop(canvas, itemCol[0], top, itemCol[1], canvas.height), signal, { x: itemCol[0], y: top });
    const anchors = itemRead.words
      .filter((w) => /^\d{1,3}$/.test(w.text))
      .map((w) => ({ n: Number(w.text), y: (w.bbox.y0 + w.bbox.y1) / 2 }));
    const count = info.rowCount ?? Math.max(0, ...anchors.map((a) => a.n));
    const centers = count >= 2 ? rowCenters(anchors, count) : null;
    if (!centers) throw new OcrLayoutError("No se pudieron ubicar las filas de la tabla.");
    const pitch = rowPitch(centers);
    const bottom = Math.min(canvas.height, centers[centers.length - 1] + pitch * 0.6);
    const reads: RowReads[] = centers.map(() => ({}));

    const names = (Object.keys(WHITELIST) as (keyof typeof WHITELIST)[]).filter((k) => header.columns[k]);
    for (const name of names) {
      tick(`Leyendo la columna ${name}`);
      const [x0, x1] = header.columns[name]!;
      await params({ tessedit_char_whitelist: WHITELIST[name] });
      const r = await words(worker, crop(canvas, x0, top, x1, bottom), signal, { x: x0, y: top });
      const perRow = assignToRows(
        r.words.map((w) => ({ ...w, y: (w.bbox.y0 + w.bbox.y1) / 2 })),
        centers,
      );
      perRow.forEach((ws, i) => {
        if (!ws.length) return;
        const sorted = [...ws].sort((a, b) => a.bbox.x0 - b.bbox.x0);
        reads[i][name] = {
          text: sorted.map((w) => w.text).join(" "),
          confidence: Math.min(...sorted.map((w) => w.confidence)),
        };
      });
    }
    tick("Revisando lo leído");

    const rows = centers.flatMap((_, i) => {
      const row = buildOcrRow(i + 1, reads[i], todayLima());
      return row ? [row] : [];
    });
    const warnings: string[] = [];
    if (info.rowCount !== null && rows.length !== info.rowCount) {
      warnings.push(`El documento dice ${info.rowCount} registros y se leyeron ${rows.length}.`);
    }
    const image = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo preparar la imagen."))), "image/jpeg", 0.85),
    );
    const bands = centers.map((c, i) => ({
      n: i + 1,
      top: (c - pitch / 2) / canvas.height,
      bottom: (c + pitch / 2) / canvas.height,
    }));
    return { rows, info, bands, image, warnings };
  } finally {
    await worker.terminate();
  }
}
