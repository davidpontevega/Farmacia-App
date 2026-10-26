import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
  type User,
} from "@/server/db/schema";

const lowerEmail = (email: string) => email.trim().toLowerCase();
const byEmail = (email: string) =>
  eq(sql`lower(${users.email})`, lowerEmail(email));

export const pendingClerkId = (email: string) => `pending:${lowerEmail(email)}`;
export const isPendingClerkId = (clerkId: string) =>
  clerkId.startsWith("pending:");

export async function findById(id: string, ex: Executor = db) {
  const [row] = await ex.select().from(users).where(eq(users.id, id));
  return row as User | undefined;
}

export async function findByClerkId(clerkId: string, ex: Executor = db) {
  const [row] = await ex.select().from(users).where(eq(users.clerkId, clerkId));
  return row as User | undefined;
}

export async function findByEmail(email: string, ex: Executor = db) {
  const [row] = await ex.select().from(users).where(byEmail(email));
  return row as User | undefined;
}

/** Adopta una fila invitada. Atómico: solo si el clerk_id sigue siendo `pending:*`. */
export async function adoptPending(
  id: string,
  clerkId: string,
  data: { name?: string } = {},
  ex: Executor = db,
) {
  const rows = await ex
    .update(users)
    .set({ clerkId, ...data })
    .where(and(eq(users.id, id), like(users.clerkId, "pending:%")))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function updateProfile(
  id: string,
  data: { name?: string; email?: string },
  ex: Executor = db,
) {
  await ex.update(users).set(data).where(eq(users.id, id));
}

export async function setActive(id: string, isActive: boolean, ex: Executor = db) {
  await ex.update(users).set({ isActive }).where(eq(users.id, id));
}

export async function insertInvited(
  data: { email: string; name: string },
  ex: Executor = db,
) {
  const email = lowerEmail(data.email);
  const [row] = await ex
    .insert(users)
    .values({ clerkId: pendingClerkId(email), email, name: data.name })
    .returning();
  return row;
}

export async function permissionCodes(userId: string, ex: Executor = db) {
  const rows = await ex
    .selectDistinct({ code: permissions.code })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.code);
}

export async function listRoles(ex: Executor = db) {
  return ex
    .select({ id: roles.id, slug: roles.slug, name: roles.name })
    .from(roles)
    .orderBy(roles.name);
}

export async function findRole(roleId: string, ex: Executor = db) {
  const [row] = await ex.select().from(roles).where(eq(roles.id, roleId));
  return row;
}

export async function listWithRoles(ex: Executor = db) {
  const [allUsers, assigned] = await Promise.all([
    ex.select().from(users).orderBy(users.name),
    ex
      .select({
        userId: userRoles.userId,
        id: roles.id,
        slug: roles.slug,
        name: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId)),
  ]);
  return allUsers.map((u) => ({
    ...u,
    roles: assigned
      .filter((a) => a.userId === u.id)
      .map(({ id, slug, name }) => ({ id, slug, name })),
  }));
}

export async function roleSlugs(userId: string, ex: Executor = db) {
  const rows = await ex
    .select({ slug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.slug);
}

// Un usuario tiene un único rol en esta UI.
export async function replaceRole(
  userId: string,
  roleId: string,
  assignedBy: string | null,
  ex: Executor = db,
) {
  await ex.delete(userRoles).where(eq(userRoles.userId, userId));
  await ex.insert(userRoles).values({ userId, roleId, assignedBy });
}

/**
 * Bloquea (FOR UPDATE) las filas de admins activos y devuelve cuántos son.
 * Llamar dentro de la transacción que cambia rol/estado: serializa las demociones concurrentes.
 * Dos sentencias: el lock espera a la otra transacción y el conteo, ya con snapshot fresco,
 * ve lo que ella confirmó (replaceRole no toca `users`, así que no basta contar en la del lock).
 * El orden por id evita deadlocks entre transacciones que bloquean los mismos admins.
 */
export async function lockActiveAdmins(ex: Executor) {
  const adminIds = ex
    .select({ id: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(roles.slug, "admin"));

  await ex
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.id, adminIds)))
    .orderBy(users.id)
    .for("update");

  const [row] = await ex
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.id, adminIds)));
  return row.n;
}
