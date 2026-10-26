import type { PermissionCode } from "./permissions";

export const NAV_ITEMS: { href: string; label: string; permission: PermissionCode }[] = [
  { href: "/pos", label: "Punto de venta", permission: "sales.create" },
  { href: "/caja", label: "Caja", permission: "cash.read" },
  { href: "/admin/products", label: "Productos", permission: "products.read" },
  { href: "/admin/inventory", label: "Inventario", permission: "lots.read" },
  { href: "/admin/users", label: "Usuarios", permission: "users.read" },
];

export const ADMIN_NAV_ITEMS = NAV_ITEMS.filter((i) => i.href.startsWith("/admin"));
