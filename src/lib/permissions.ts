// Los permisos nacen del código; db:seed los sincroniza a la tabla `permissions`.
export const PERMISSION_ACTIONS = {
  products: ["read", "create", "update", "delete"],
  lots: ["read", "create", "update"],
  inventory: ["read", "adjust", "kardex"],
  sales: ["create", "read", "void"],
  cash: ["open", "close", "read", "withdraw", "exchange", "supervise"],
  returns: ["create", "read"],
  purchases: ["create", "read"],
  users: ["read", "create", "update", "deactivate"],
  roles: ["read", "manage"],
  audit: ["read"],
  reports: ["read"],
  shortages: ["create", "read", "update"],
} as const;

type Actions = typeof PERMISSION_ACTIONS;
export type PermissionCode = {
  [R in keyof Actions]: `${R}.${Actions[R][number]}`;
}[keyof Actions];

export const PERMISSIONS: readonly PermissionCode[] = Object.entries(
  PERMISSION_ACTIONS,
).flatMap(([resource, actions]) =>
  actions.map((action) => `${resource}.${action}` as PermissionCode),
);

export const CASHIER_PERMISSIONS: readonly PermissionCode[] = [
  "sales.create",
  "sales.read",
  "cash.open",
  "cash.close",
  "cash.read",
  "cash.withdraw",
  "cash.exchange",
  "returns.create",
  "products.read",
  "inventory.read",
  "shortages.create",
];

export function splitPermission(code: PermissionCode) {
  const [resource, action] = code.split(".");
  return { resource, action };
}
