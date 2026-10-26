// El dinero viaja y se guarda en centavos enteros; solo la UI usa soles.

const SOLES = /^\d+([.,]\d{1,2})?$/;

export function isValidSoles(input: string) {
  return SOLES.test(input.trim());
}

/** "2.50" | "2,5" | "2" -> 250 | 250 | 200. Lanza si el formato no es válido. */
export function toCents(input: string) {
  const value = input.trim();
  if (!SOLES.test(value)) throw new Error(`Monto inválido: "${input}"`);
  const [whole, frac = ""] = value.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** 250 -> "S/ 2.50" */
export function formatSoles(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}S/ ${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** 250 -> "2.50", para precargar un input de soles. */
export function centsToInput(cents: number) {
  return formatSoles(cents).replace("S/ ", "");
}
