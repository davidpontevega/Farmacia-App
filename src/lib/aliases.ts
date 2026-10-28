// Nombres alternativos de un producto (spec 020): reglas puras. Sin red ni base de datos.
import { normalize } from "./text";

export const MAX_ALIASES = 10;
export const ALIAS_MIN = 2;
export const ALIAS_MAX = 60;

const CONTROL = /[\u0000-\u001f\u007f]/;

/** Espacios simples y sin bordes: «  Ondansetrón   8 mg » → «Ondansetrón 8 mg». */
export const cleanAlias = (s: string) => s.replace(/\s+/g, " ").trim();

/** Motivo por el que un alias suelto no sirve, o null. */
export function aliasError(alias: string): string | null {
  if (CONTROL.test(alias)) return "Caracteres no válidos en el nombre alternativo";
  const a = cleanAlias(alias);
  if (a.length < ALIAS_MIN) return `Cada nombre alternativo necesita al menos ${ALIAS_MIN} caracteres`;
  if (a.length > ALIAS_MAX) return `Cada nombre alternativo admite hasta ${ALIAS_MAX} caracteres`;
  return null;
}

/** Lista completa: tope, longitudes y sin repetidos (sin distinguir tildes ni mayúsculas) ni iguales al nombre comercial. */
export function aliasesError(aliases: readonly string[], commercialName?: string): string | null {
  if (aliases.length > MAX_ALIASES) return `Máximo ${MAX_ALIASES} nombres alternativos`;
  const seen = new Set<string>(commercialName ? [normalize(commercialName)] : []);
  for (const alias of aliases) {
    const error = aliasError(alias);
    if (error) return error;
    const key = normalize(alias);
    if (seen.has(key)) return `«${cleanAlias(alias)}» está repetido o es igual al nombre comercial`;
    seen.add(key);
  }
  return null;
}

type Aliased = { commercialName: string; genericName: string | null; aliases: readonly string[] };

/**
 * El alias que explica por qué aparece el producto en una búsqueda: el primero que contiene algún término,
 * pero solo si ni el nombre comercial ni el genérico lo contienen (si no, el alias no hizo falta).
 */
export function matchedAlias(product: Aliased, terms: readonly string[]): string | null {
  const wanted = terms.map(normalize).filter(Boolean);
  if (wanted.length === 0) return null;
  const names = [normalize(product.commercialName), normalize(product.genericName ?? "")];
  if (wanted.some((t) => names.some((n) => n.includes(t)))) return null;
  return product.aliases.find((a) => wanted.some((t) => normalize(a).includes(t))) ?? null;
}
