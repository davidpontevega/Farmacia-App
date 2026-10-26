// Leer filas de compra desde texto pegado (copiado de un PDF, un Excel o escrito a mano).
// Orden esperado: [ítem] código, cantidad, unidad, descripción, [vencimiento], precio, total.

export type PastedRow = {
  code: string;
  qty: string;
  um: string;
  description: string;
  expiry: string;
  price: string;
  total: string;
};

export type ParsedLine = { raw: string; row: PastedRow | null };

const NUM = String.raw`\d[\d.,]*`;
const DATE = String.raw`\d{1,2}\/\d{2}\/\d{2,4}|\d{1,2}\/\d{2,4}`;
const CODE = /^[A-Za-zÑñ]{2,5}\d{3,5}$/;

// Filas de una sola línea con espacios simples (lo que sale al copiar de un PDF).
const LINE = new RegExp(
  String.raw`^(?:\d{1,3}\s+)?([A-Za-zÑñ]{2,5}\d{3,5})\s+(\d{1,5})\s+([A-Za-z]{2,4})\s+(.+?)(?:\s+(${DATE}))?\s+(${NUM})\s+(${NUM})$`,
);

/** "1,863.50" -> "1863.50"; "1,80" -> "1.80". */
export function cleanNumber(text: string) {
  const t = text.trim();
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return t.replace(/,/g, "");
  if (/^\d+,\d{1,2}$/.test(t)) return t.replace(",", ".");
  return t;
}

function fromRegex(line: string): PastedRow | null {
  const m = line.match(LINE);
  if (!m) return null;
  return {
    code: m[1].toUpperCase(),
    qty: m[2],
    um: m[3].toUpperCase(),
    description: m[4].trim(),
    expiry: m[5] ?? "",
    price: cleanNumber(m[6]),
    total: cleanNumber(m[7]),
  };
}

// Columnas separadas por tabulación, `;` o espacios múltiples: se clasifica cada campo por su forma.
function fromFields(line: string): PastedRow | null {
  const fields = line.split(/\t|;|\s{2,}/).map((f) => f.trim()).filter(Boolean);
  if (fields.length < 4) return null;

  const dateRe = new RegExp(`^(?:${DATE})$`);
  const codeIdx = fields.findIndex((f) => CODE.test(f));
  const code = codeIdx >= 0 ? fields[codeIdx] : "";
  const rest = fields.filter((_, i) => i !== codeIdx);

  // un entero inicial suelto es el número de ítem
  if (/^\d{1,3}$/.test(rest[0] ?? "") && rest.length > 1 && codeIdx > 0) rest.shift();

  const qtyIdx = rest.findIndex((f) => /^\d{1,5}$/.test(f));
  const qty = qtyIdx >= 0 ? rest.splice(qtyIdx, 1)[0] : "";
  const umIdx = rest.findIndex((f) => /^[A-Za-z]{2,4}$/.test(f));
  const um = umIdx >= 0 ? rest.splice(umIdx, 1)[0] : "";
  const dateIdx = rest.findIndex((f) => dateRe.test(f));
  const expiry = dateIdx >= 0 ? rest.splice(dateIdx, 1)[0] : "";

  const numIdx = rest.map((f, i) => (new RegExp(`^${NUM}$`).test(f) ? i : -1)).filter((i) => i >= 0);
  const nums = numIdx.map((i) => rest[i]);
  const remaining = rest.filter((_, i) => !numIdx.includes(i));
  const description = remaining.sort((a, b) => b.length - a.length)[0] ?? "";

  const price = nums.length >= 2 ? nums[nums.length - 2] : (nums[0] ?? "");
  const total = nums.length >= 2 ? nums[nums.length - 1] : "";
  if (!description || !qty || !price) return null;
  return {
    code: code.toUpperCase(),
    qty,
    um: um.toUpperCase(),
    description,
    expiry,
    price: cleanNumber(price),
    total: cleanNumber(total),
  };
}

export function parsePastedRows(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw) => ({ raw, row: fromRegex(raw) ?? fromFields(raw) }));
}
