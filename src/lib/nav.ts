import type { PermissionCode } from "./permissions";
import { normalize } from "./text";

export type NavSection = "Operación" | "Inventario" | "Análisis" | "Administración";

export type NavItem = {
  href: string;
  label: string;
  section: NavSection;
  /** Sin permiso: lo ve todo usuario con acceso al sistema. */
  permission?: PermissionCode;
  /** Contador que se muestra junto al ítem (spec 023). */
  counter?: "shortages" | "alerts";
};

export const NAV_SECTIONS: NavSection[] = ["Operación", "Inventario", "Análisis", "Administración"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Inicio", section: "Operación" },
  { href: "/pos", label: "Punto de venta", section: "Operación", permission: "sales.create" },
  { href: "/caja", label: "Caja", section: "Operación", permission: "cash.read" },
  { href: "/consulta", label: "Consulta", section: "Operación", permission: "products.read" },
  { href: "/devoluciones", label: "Devoluciones", section: "Operación", permission: "returns.create" },
  { href: "/admin/products", label: "Productos", section: "Inventario", permission: "products.read" },
  { href: "/admin/inventory", label: "Inventario", section: "Inventario", permission: "lots.read" },
  { href: "/admin/purchases", label: "Compras", section: "Inventario", permission: "purchases.create" },
  { href: "/admin/shortages", label: "Faltantes", section: "Inventario", permission: "shortages.read", counter: "shortages" },
  { href: "/admin/sales", label: "Ventas", section: "Análisis", permission: "reports.read" },
  { href: "/admin/reports", label: "Reportes", section: "Análisis", permission: "reports.read", counter: "alerts" },
  { href: "/admin/returns", label: "Historial de devoluciones", section: "Análisis", permission: "returns.read" },
  { href: "/admin/users", label: "Usuarios", section: "Administración", permission: "users.read" },
];

export const ADMIN_NAV_ITEMS = NAV_ITEMS.filter((i) => i.href.startsWith("/admin"));

export const canSee = (item: NavItem, permissions: readonly string[]) => !item.permission || permissions.includes(item.permission);

/** Los ítems que el usuario puede ver, agrupados por sección; una sección sin ítems no aparece. */
export function groupNav<T extends NavItem>(items: readonly T[], permissions: readonly string[]): { title: NavSection; items: T[] }[] {
  const visible = items.filter((i) => canSee(i, permissions));
  return NAV_SECTIONS.map((title) => ({ title, items: visible.filter((i) => i.section === title) })).filter((s) => s.items.length > 0);
}

/** Título y subtítulo del encabezado de cada pantalla. `datedSubtitle`: se acompaña con la fecha de hoy. */
const PAGE_META: { prefix: string; title: string; subtitle: string; dated?: boolean }[] = [
  { prefix: "/inicio", title: "Inicio", subtitle: "Resumen del día", dated: true },
  { prefix: "/pos", title: "Punto de venta", subtitle: "Busca productos y cobra la venta" },
  { prefix: "/caja", title: "Control de caja", subtitle: "Apertura, movimientos y cierre del turno" },
  { prefix: "/consulta", title: "Consulta de medicamentos", subtitle: "Qué hay en el local para cada síntoma" },
  { prefix: "/devoluciones", title: "Devoluciones", subtitle: "Registra lo que el cliente devuelve" },
  { prefix: "/admin/products", title: "Productos", subtitle: "Catálogo, precios y ubicación en el estante" },
  { prefix: "/admin/inventory", title: "Inventario", subtitle: "Lotes, vencimientos y kardex" },
  { prefix: "/admin/purchases", title: "Compras", subtitle: "Registra la mercadería que llega" },
  { prefix: "/admin/shortages", title: "Faltantes", subtitle: "Lo que los clientes piden y no hay" },
  { prefix: "/admin/sales", title: "Ventas", subtitle: "Historial de ventas por fechas" },
  { prefix: "/admin/reports", title: "Reportes", subtitle: "Ventas, inventario y alertas" },
  { prefix: "/admin/returns", title: "Historial de devoluciones", subtitle: "Devoluciones registradas" },
  { prefix: "/admin/users", title: "Usuarios", subtitle: "Invitaciones, roles y accesos" },
];

export function pageMeta(pathname: string): { title: string; subtitle: string; dated: boolean } {
  const m = PAGE_META.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  return m ? { title: m.title, subtitle: m.subtitle, dated: !!m.dated } : { title: "NicFarma", subtitle: "", dated: false };
}

/** Buscador «Ir a…»: cada palabra escrita debe estar en el nombre (sin tildes ni mayúsculas); sin texto, todo. */
export function filterNav<T extends NavItem>(query: string, items: readonly T[]): T[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [...items];
  return items.filter((i) => {
    const text = normalize(`${i.label} ${i.section}`);
    return words.every((w) => text.includes(w));
  });
}
