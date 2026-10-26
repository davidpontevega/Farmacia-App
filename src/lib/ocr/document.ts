// Datos del documento leídos del texto de toda la hoja: número, fecha, totales y cantidad de filas.
// Lo que no se encuentra queda en null: nada se inventa.

export type DocumentInfo = {
  /** Razón social del emisor, p. ej. "HEALTEC SAC". */
  supplierName: string | null;
  documentNumber: string | null;
  /** ISO `YYYY-MM-DD`. */
  documentDate: string | null;
  subtotalCents: number | null;
  igvCents: number | null;
  totalCents: number | null;
  /** "TOTAL REGISTROS : 16". */
  rowCount: number | null;
};

const MONTHS: Record<string, number> = {
  enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3, abril: 4, abr: 4, mayo: 5, may: 5,
  junio: 6, jun: 6, julio: 7, jul: 7, agosto: 8, ago: 8, setiembre: 9, septiembre: 9, sep: 9, set: 9,
  octubre: 10, oct: 10, noviembre: 11, nov: 11, diciembre: 12, dic: 12,
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "1,863.50" → 186350. */
function toCents(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = raw.replace(/,(?=\d{3})/g, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

function findDate(text: string): string | null {
  // "FECHA : viernes, 12 Junio, 2026" (el día de la semana puede salir mal leído)
  const named = fold(text).match(/fecha\s*[:.]?\s*[^\d\n]*?(\d{1,2})\s*(?:de\s+)?([a-z]+)\W+(?:de\s+)?(\d{4})/);
  if (named) {
    const month = MONTHS[named[2]];
    const day = Number(named[1]);
    if (month && day >= 1 && day <= 31) return `${named[3]}-${pad(month)}-${pad(day)}`;
  }
  const numeric = text.match(/fecha\s*[:.]?\s*[^\d\n]*?(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
  if (numeric) {
    const [d, m, y] = [Number(numeric[1]), Number(numeric[2]), numeric[3]];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${y}-${pad(m)}-${pad(d)}`;
  }
  return null;
}

function findNumber(text: string): string | null {
  const m = text.match(/(?:cotizaci[oó]n|factura|boleta|proforma|gu[ií]a)(?:[^\n]*\n){0,3}?[^\n]*?\bN[°º*]\s*([A-Z0-9][A-Z0-9-]{4,})/i);
  return m ? m[1].toUpperCase() : null;
}

/** Primera razón social con sufijo societario ("... S.A.C."): es la del emisor, que va arriba del documento. */
function findSupplier(text: string): string | null {
  const m = text.match(/((?:[A-ZÑ][A-ZÑ&.-]+\s+){1,3})(S\.?A\.?C\.?|S\.?R\.?L\.?|E\.?I\.?R\.?L\.?|S\.?A\.?)(?![A-Za-z])/);
  return m ? `${m[1].trim()} ${m[2].replace(/\./g, "")}` : null;
}

/** "GASTOS DE ENVIO", flete, transporte: un cargo del documento, no un producto. */
export const isShippingLine = (description: string) =>
  /^\s*(gastos?\s+de\s+(env[ií]o|transporte|flete)|env[ií]o|flete|transporte|movilidad)(?![a-zñ])/i.test(description);

export function readDocumentInfo(text: string): DocumentInfo {
  const amount = (label: RegExp) => toCents(text.match(label)?.[1]);
  const registros = text.match(/TOTAL\s+REGISTROS\s*[:.]?\s*\D{0,3}(\d{1,4})/i)?.[1];
  return {
    supplierName: findSupplier(text),
    documentNumber: findNumber(text),
    documentDate: findDate(text),
    subtotalCents: amount(/SUB\s*TOTAL[^0-9\n]*([\d.,]+)/i),
    igvCents: amount(/I\.?\s?G\.?\s?V\.?[^0-9\n]*([\d.,]+)/i),
    totalCents: amount(/TOTAL\s+IMPORTE[^0-9\n]*([\d.,]+)/i),
    rowCount: registros ? Number(registros) : null,
  };
}
