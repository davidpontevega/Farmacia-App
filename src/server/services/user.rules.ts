type Target = { isSelf: boolean; isActiveAdmin: boolean; activeAdmins: number };

const isLastAdmin = (t: Pick<Target, "isActiveAdmin" | "activeAdmins">) =>
  t.isActiveAdmin && t.activeAdmins <= 1;

/** Nadie se desactiva a sí mismo ni deja el sistema sin admin activo. */
export function canDeactivate(t: Target) {
  return !t.isSelf && !isLastAdmin(t);
}

/** Quitar el rol admin al último admin activo dejaría el sistema sin administración. */
export function canChangeRole(
  t: Pick<Target, "isActiveAdmin" | "activeAdmins">,
  newRoleIsAdmin: boolean,
) {
  return newRoleIsAdmin || !isLastAdmin(t);
}
