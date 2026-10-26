"use client";

import type { PermissionCode } from "@/lib/permissions";
import { usePermissions } from "../hooks/use-permissions";

/** Solo UX: el servidor vuelve a validar el permiso en cada endpoint. */
export function Can({
  permission,
  children,
}: {
  permission: PermissionCode;
  children: React.ReactNode;
}) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : null;
}
