import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { db } from "@/server/db";
import type { PermissionCode } from "@/lib/permissions";
import * as userRepo from "@/server/repositories/user.repository";

export type AuthContext = {
  user: NonNullable<Awaited<ReturnType<typeof userRepo.findById>>>;
  permissions: string[];
};

// Primer login de un usuario invitado (o del super admin del seed) cuando el webhook
// aún no llegó: su fila tiene clerk_id `pending:<email>`; se adopta por email verificado.
async function adoptPendingByEmail(clerkId: string) {
  const clerkUser = await (await clerkClient()).users.getUser(clerkId);
  const primary = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  );
  if (!primary || primary.verification?.status !== "verified") return undefined;

  const row = await userRepo.findByEmail(primary.emailAddress);
  if (!row || !userRepo.isPendingClerkId(row.clerkId)) return undefined;

  const adopted = await db.transaction(async (tx) => {
    const ok = await userRepo.adoptPending(row.id, clerkId, {}, tx);
    if (ok) {
      await writeAudit(tx, {
        actorId: row.id,
        action: "user.adopted",
        entityType: "user",
        entityId: row.id,
        metadata: { source: "first_login" },
      });
    }
    return ok;
  });
  // Si perdió la carrera contra el webhook, la fila ya tiene su clerk_id.
  return adopted ? { ...row, clerkId } : userRepo.findByClerkId(clerkId);
}

/** Usuario autenticado y activo, sin exigir permiso concreto. Lanza 401/403. */
export async function requireUser(): Promise<AuthContext> {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();

  const user =
    (await userRepo.findByClerkId(userId)) ?? (await adoptPendingByEmail(userId));
  if (!user) throw new ForbiddenError("Usuario no registrado en el sistema");
  if (!user.isActive) throw new ForbiddenError("Usuario desactivado");

  return { user, permissions: await userRepo.permissionCodes(user.id) };
}

export async function requirePermission(code: PermissionCode): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!ctx.permissions.includes(code)) throw new ForbiddenError();
  return ctx;
}

/** Para Server Components: null en vez de lanzar, así el layout puede redirigir. */
export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    return await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return null;
    }
    throw err;
  }
}

/** Guarda de página (Server Component): sin sesión válida -> /no-access, sin permiso -> /pos. */
export async function requirePagePermission(code: PermissionCode): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/no-access");
  if (!ctx.permissions.includes(code)) redirect("/pos");
  return ctx;
}
