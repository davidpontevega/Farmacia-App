// Las fechas de negocio (vencimientos, kardex) son ISO `YYYY-MM-DD` en hora de Lima.
const TIME_ZONE = "America/Lima";

export function todayLima(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isRealDate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && addDays(iso, 0) === iso;
}

/** "2027-06-30" -> "30/06/2027" (sin pasar por Date: evita corrimientos de zona). */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** «miércoles 28 de octubre» (con la primera en mayúscula) para un día `YYYY-MM-DD`. */
export function formatLongDate(iso: string) {
  const text = new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const plain = text.replace(",", "");
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { timeZone: TIME_ZONE });
}
