import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { writeAudit } from "@/lib/audit";
import {
  AppError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors";
import type { InviteUserInput, UpdateUserInput } from "@/modules/users/schemas";
import * as userRepo from "@/server/repositories/user.repository";
import { canChangeRole, canDeactivate } from "./user.rules";

function appUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL no está definida");
  }
  return url ?? "http://localhost:3000";
}

// Los rechazos 4xx de Clerk son errores de negocio, no 500.
function fromClerk(err: unknown): never {
  if (isClerkAPIResponseError(err) && err.status < 500) {
    throw new BusinessRuleError(err.errors[0]?.longMessage ?? "Clerk rechazó la operación");
  }
  throw err;
}

async function getTarget(id: string) {
  const target = await userRepo.findById(id);
  if (!target) throw new NotFoundError("Usuario no encontrado");
  return target;
}

/** Dentro de la transacción: bloquea a los admins activos y evalúa el estado del objetivo. */
async function adminState(tx: Executor, targetId: string, isActive: boolean) {
  const activeAdmins = await userRepo.lockActiveAdmins(tx);
  const slugs = await userRepo.roleSlugs(targetId, tx);
  return { isActiveAdmin: isActive && slugs.includes("admin"), activeAdmins, slugs };
}

export async function inviteUser(actorId: string, input: InviteUserInput) {
  const email = input.email.trim().toLowerCase();
  const role = await userRepo.findRole(input.roleId);
  if (!role) throw new NotFoundError("Rol no existe");
  if (await userRepo.findByEmail(email)) {
    throw new ConflictError("Ya existe un usuario con ese correo");
  }

  const clerk = await clerkClient();
  const invitation = await clerk.invitations
    .createInvitation({ emailAddress: email, redirectUrl: `${appUrl()}/accept-invite` })
    .catch(fromClerk);

  try {
    return await db.transaction(async (tx) => {
      const user = await userRepo.insertInvited({ email, name: input.name }, tx);
      await userRepo.replaceRole(user.id, role.id, actorId, tx);
      await writeAudit(tx, {
        actorId,
        action: "user.invited",
        entityType: "user",
        entityId: user.id,
        changes: { role: role.slug },
      });
      return user;
    });
  } catch (err) {
    // Sin fila local el invitado no podría entrar con rol: se anula la invitación.
    await clerk.invitations.revokeInvitation(invitation.id).catch(console.error);
    throw err;
  }
}

export async function updateUser(actorId: string, id: string, input: UpdateUserInput) {
  const target = await getTarget(id);
  const role = input.roleId ? await userRepo.findRole(input.roleId) : undefined;
  if (input.roleId && !role) throw new NotFoundError("Rol no existe");

  await db.transaction(async (tx) => {
    if (role) {
      const state = await adminState(tx, target.id, target.isActive);
      if (!canChangeRole(state, role.slug === "admin")) {
        throw new BusinessRuleError("No se puede quitar el rol al último administrador activo");
      }
      await userRepo.replaceRole(target.id, role.id, actorId, tx);
      await writeAudit(tx, {
        actorId,
        action: "user.role_changed",
        entityType: "user",
        entityId: target.id,
        changes: { from: state.slugs, to: role.slug },
      });
    }
    if (input.name !== undefined && input.name !== target.name) {
      await userRepo.updateProfile(target.id, { name: input.name }, tx);
      await writeAudit(tx, {
        actorId,
        action: "user.updated",
        entityType: "user",
        entityId: target.id,
        changes: { fields: ["name"] },
      });
    }
  });
}

/**
 * Primero la BD: así el acceso se corta aunque Clerk falle (requirePermission lee is_active).
 * Reintentar completa el ban y la revocación de sesiones.
 */
export async function deactivateUser(actorId: string, id: string) {
  const target = await getTarget(id);

  if (target.isActive) {
    await db.transaction(async (tx) => {
      const state = await adminState(tx, target.id, true);
      if (!canDeactivate({ isSelf: target.id === actorId, ...state })) {
        throw new BusinessRuleError(
          target.id === actorId
            ? "No puedes desactivarte a ti mismo"
            : "No se puede desactivar al último administrador activo",
        );
      }
      await userRepo.setActive(target.id, false, tx);
      await writeAudit(tx, {
        actorId,
        action: "user.deactivated",
        entityType: "user",
        entityId: target.id,
        severity: "warning",
      });
    });
  }

  if (userRepo.isPendingClerkId(target.clerkId)) return;
  try {
    const clerk = await clerkClient();
    await clerk.users.banUser(target.clerkId);
    const sessions = await clerk.sessions.getSessionList({
      userId: target.clerkId,
      status: "active",
    });
    await Promise.all(sessions.data.map((s) => clerk.sessions.revokeSession(s.id)));
  } catch (err) {
    console.error(err);
    await writeAudit(db, {
      actorId,
      action: "user.deactivate_clerk_failed",
      entityType: "user",
      entityId: target.id,
      severity: "error",
    });
    throw new AppError(
      502,
      "Usuario desactivado, pero falló el bloqueo en Clerk. Vuelve a desactivar para reintentar",
    );
  }
}

export async function reactivateUser(actorId: string, id: string) {
  const target = await getTarget(id);
  if (!userRepo.isPendingClerkId(target.clerkId)) {
    // 404: el usuario ya no existe en Clerk; la fila local se reactiva igual.
    await (await clerkClient()).users.unbanUser(target.clerkId).catch((err: unknown) => {
      if (!(isClerkAPIResponseError(err) && err.status === 404)) fromClerk(err);
    });
  }
  if (target.isActive) return;
  await db.transaction(async (tx) => {
    await userRepo.setActive(target.id, true, tx);
    await writeAudit(tx, {
      actorId,
      action: "user.reactivated",
      entityType: "user",
      entityId: target.id,
    });
  });
}

/**
 * Webhook user.created / user.updated. El llamador garantiza email verificado.
 * Solo reconcilia usuarios ya invitados; un alta sin invitación no crea fila.
 */
export async function syncFromClerk(data: { clerkId: string; email: string; name: string }) {
  const email = data.email.toLowerCase();
  const byClerk = await userRepo.findByClerkId(data.clerkId);

  if (byClerk) {
    const owner = await userRepo.findByEmail(email);
    // Si otro usuario ya tiene ese correo (unique), solo se sincroniza el nombre.
    const nextEmail = !owner || owner.id === byClerk.id ? email : byClerk.email;
    const fields = [
      ...(data.name !== byClerk.name ? ["name"] : []),
      ...(nextEmail !== byClerk.email ? ["email"] : []),
    ];
    if (fields.length === 0) return;
    await db.transaction(async (tx) => {
      await userRepo.updateProfile(byClerk.id, { name: data.name, email: nextEmail }, tx);
      await writeAudit(tx, {
        actorId: null,
        action: "user.synced",
        entityType: "user",
        entityId: byClerk.id,
        changes: { fields },
        metadata: { source: "clerk.webhook" },
      });
    });
    return;
  }

  const invited = await userRepo.findByEmail(email);
  if (!invited || !userRepo.isPendingClerkId(invited.clerkId)) return;
  await db.transaction(async (tx) => {
    const ok = await userRepo.adoptPending(invited.id, data.clerkId, { name: data.name }, tx);
    if (!ok) return;
    await writeAudit(tx, {
      actorId: invited.id,
      action: "user.adopted",
      entityType: "user",
      entityId: invited.id,
      metadata: { source: "clerk.webhook" },
    });
  });
}

/** Webhook user.deleted: nunca se borra la fila (ventas y turnos la referencian). */
export async function deactivateFromClerk(clerkId: string) {
  const user = await userRepo.findByClerkId(clerkId);
  if (!user || !user.isActive) return;
  await db.transaction(async (tx) => {
    await userRepo.setActive(user.id, false, tx);
    await writeAudit(tx, {
      actorId: null,
      action: "user.deactivated",
      entityType: "user",
      entityId: user.id,
      severity: "warning",
      metadata: { source: "clerk.user.deleted" },
    });
  });
}
