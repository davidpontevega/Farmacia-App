/** Postgres 23505. Drizzle puede envolver el error original en `cause`. */
export function isUniqueViolation(err: unknown) {
  let current: unknown = err;
  while (current && typeof current === "object") {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
