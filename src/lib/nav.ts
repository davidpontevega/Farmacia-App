import type { PermissionCode } from "./permissions";

export const NAV_ITEMS: { href: string; label: string; permission: PermissionCode }[] = [
  { href: "/pos", label: "Punto de venta", permission: "sales.create" },
  { href: "/admin/users", label: "Usuarios", permission: "users.read" },
];
