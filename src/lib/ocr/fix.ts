// Del texto crudo del OCR a una fila de compra, marcando lo dudoso. Reglas conservadoras:
// solo se corrige lo que tiene una única solución clara; lo demás se deja como se leyó y se marca.
import { isFarExpiry, parseExpiry } from "../purchase-rules";

/** Campos de una fila que pueden quedar dudosos (coinciden con los de `PurchaseRow`). */
export type UncertainField =
  | "supplierCode"
  | "qty"
  | "um"
  | "expiry"
  | "packagePrice"
  | "lineTotal"
  | "description";

export type CellRead = { text: string; confidence: number };
export type RowReads = Partial<
  Record<"code" | "qty" | "um" | "desc" | "date" | "price" | "total", CellRead>
>;

export type OcrRow = {
  /** Número de ítem del documento. */
  n: number;
  supplierCode: string;
  qty: string;
  um: string;
  description: string;
  expiry: string;
  price: string;
  total: string;
  uncertain: UncertainField[];
};

export const KNOWN_UM = ["CAJ", "UND", "SOB", "FCO", "PAQ", "BOL", "TUB", "ROL", "AMP", "BLS", "KIT"];

export function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

export type UmResult = { value: string; status: "ok" | "fixed" | "unknown" };

/** Unidad conocida; si difiere en un carácter de una sola unidad conocida, se ajusta ("UNO" → UND). */
export function normalizeUm(text: string, known: string[] = KNOWN_UM): UmResult {
  const t = text.toUpperCase().replace(/[^A-Z]/g, "");
  if (!t) return { value: "", status: "unknown" };
  if (known.includes(t)) return { value: t, status: "ok" };
  const close = known.filter((k) => editDistance(t, k) <= 1);
  return close.length === 1 ? { value: close[0], status: "fixed" } : { value: "", status: "unknown" };
}

/** "1,80" → "1.80"; "144.0" se acepta; todo lo que no sea un número de hasta 2 decimales → null. */
export function parseDecimal(text: string): string | null {
  const t = text.trim().replace(/\s+/g, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(t) ? t : null;
}

const cents = (s: string) => Math.round(Number(s) * 100);
const CODE_SHAPE = /^[A-ZÑ]{2,5}\d{3,5}$/;
const LOW = 60;
const LOW_CODE = 80;

/**
 * Arma una fila con lo leído de cada columna. Devuelve null si la fila está vacía.
 * No "arregla" códigos: el OCR los confunde (0/O, 1/I, 6/S) y una corrección plausible pero falsa
 * sería peor que una celda marcada.
 */
export function buildOcrRow(n: number, reads: RowReads, today?: string): OcrRow | null {
  const text = (k: keyof RowReads) => reads[k]?.text.trim() ?? "";
  const conf = (k: keyof RowReads) => reads[k]?.confidence ?? 100;
  const uncertain = new Set<UncertainField>();

  const qtyText = text("qty").replace(/\D/g, "");
  const description = text("desc").replace(/\s+/g, " ");
  const price = parseDecimal(text("price"));
  const total = parseDecimal(text("total"));
  if (!qtyText && !description && !price) return null;

  const qty = /^[1-9]\d{0,4}$/.test(qtyText) ? qtyText : "";
  if (!qty || conf("qty") < LOW) uncertain.add("qty");

  const um = normalizeUm(text("um"));
  if (um.status !== "ok") uncertain.add("um");

  const code = text("code").toUpperCase().replace(/[^A-ZÑ0-9]/g, "");
  if (!CODE_SHAPE.test(code) || conf("code") < LOW_CODE) uncertain.add("supplierCode");

  const expiryText = text("date");
  if (expiryText) {
    const iso = parseExpiry(expiryText);
    // Un año de más ("2078") o una fecha ya pasada casi siempre es un dígito mal leído.
    const implausible = iso !== null && today !== undefined && (iso < today || isFarExpiry(iso, today));
    if (iso === null || implausible || conf("date") < LOW) uncertain.add("expiry");
  }

  if (!description) uncertain.add("description");
  if (price === null) uncertain.add("packagePrice");
  if (text("total") && total === null) uncertain.add("lineTotal");

  // La regla cantidad × precio = total marca a los dos: no se sabe cuál de los dos se leyó mal.
  if (qty && price !== null && total !== null && Number(qty) * cents(price) !== cents(total)) {
    uncertain.add("packagePrice");
    uncertain.add("lineTotal");
  }

  return {
    n,
    supplierCode: code,
    qty,
    um: um.value,
    description,
    expiry: expiryText,
    price: price ?? "",
    total: total ?? "",
    uncertain: [...uncertain],
  };
}
