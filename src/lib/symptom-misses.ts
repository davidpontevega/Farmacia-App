// Consultas sin resultado (spec 021): qué se guarda y por cuánto tiempo. Puro, sin base de datos.
import { normalize } from "./text";

export const MISS_MIN_CHARS = 3;
export const MISS_MAX_CHARS = 80;
export const MISS_MAX_WORDS = 6;
export const MISS_RETENTION_DAYS = 90;
export const MISS_LIST_LIMIT = 100;

const CONTROL = /[\u0000-\u001f\u007f]/;
// Signos de puntuación comunes: «dolor de cabeza?» y «dolor de cabeza» son la misma consulta.
const PUNCTUATION = /[.,;:!?¿¡"'()-]/g;

/**
 * El texto normalizado a guardar, o null si no se guarda. Lo escrito en un buscador puede traer datos de un paciente:
 * solo se guardan frases cortas hechas únicamente de letras (sin dígitos, correos ni símbolos).
 * Límite conocido: una frase corta de solo letras puede ser un nombre («juan perez»); la tabla es anónima, se borra a los
 * 90 días, solo la ve administración y cada fila se puede quitar.
 */
export function missKey(query: string): string | null {
  if (CONTROL.test(query)) return null;
  const key = normalize(query.replace(PUNCTUATION, " "));
  if (key.length < MISS_MIN_CHARS || key.length > MISS_MAX_CHARS) return null;
  if (!/^[a-z ]+$/.test(key)) return null;
  if (key.split(" ").length > MISS_MAX_WORDS) return null;
  return key;
}

/** Las consultas con última vez anterior a esto se borran. */
export const missesSince = (now: Date) => new Date(now.getTime() - MISS_RETENTION_DAYS * 86_400_000);
