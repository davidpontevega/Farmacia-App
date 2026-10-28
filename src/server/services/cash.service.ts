import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { isUniqueViolation } from "@/server/db/errors";
import { writeAudit } from "@/lib/audit";
import { cashHeldByMessage, closingValues, expectedCash, expectedYape, isShiftStale, staleShiftMessage, type CloseMode } from "@/lib/cash";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type {
  CloseShiftInput,
  ForceCloseInput,
  MovementInput,
  OpenShiftInput,
} from "@/modules/cash/schemas";
import * as cashRepo from "@/server/repositories/cash.repository";

const NO_OPEN_SHIFT = "No tienes un turno de caja abierto";

/**
 * Reutilizar en toda operación que escriba en un turno (venta, devolución en efectivo):
 * así el cierre y esas operaciones se serializan sobre la misma fila.
 *
 * Turno abierto del usuario, ya bloqueado. Devuelve el turno bloqueado para que
 * los totales se lean después del lock: una sentencia nueva ve lo que otra
 * transacción confirmó (un movimiento o venta concurrente entra o se rechaza).
 */
export async function lockOpenShift(tx: Executor, userId: string, opts: { allowStale?: boolean } = {}) {
  const open = await cashRepo.findOpenShift(userId, tx);
  if (!open) throw new ConflictError(NO_OPEN_SHIFT);
  const locked = await cashRepo.lockShift(open.id, tx);
  if (locked.status !== "OPEN") throw new ConflictError(NO_OPEN_SHIFT);
  // Un turno de un día anterior solo se puede cerrar: ni ventas, ni devoluciones, ni retiros (spec 022).
  if (!opts.allowStale && isShiftStale(locked.openedAt)) throw new ConflictError(staleShiftMessage(locked.openedAt));
  return locked;
}

function toSummary(
  opening: number,
  t: Awaited<ReturnType<typeof cashRepo.shiftTotals>>,
) {
  const totals = { opening, ...t };
  return { ...t, expectedCash: expectedCash(totals), expectedYape: expectedYape(totals) };
}

export async function getActiveShift(userId: string) {
  const shift = await cashRepo.findOpenShift(userId);
  if (!shift) return { shift: null };

  const [totals, movements] = await Promise.all([
    cashRepo.shiftTotals(shift.id),
    cashRepo.movementsOfShift(shift.id),
  ]);
  return {
    shift: { id: shift.id, openingAmount: shift.openingAmount, openedAt: shift.openedAt, stale: isShiftStale(shift.openedAt) },
    summary: toSummary(shift.openingAmount, totals),
    movements,
  };
}

export async function openShift(userId: string, input: OpenShiftInput) {
  try {
    return await db.transaction(async (tx) => {
      const held = await cashRepo.findLocalOpenShift(tx);
      if (held) {
        throw new ConflictError(held.userId === userId ? "Ya tienes un turno de caja abierto" : cashHeldByMessage(held.ownerName, held.openedAt));
      }
      const shift = await cashRepo.insertShift(
        { userId, openingAmount: input.openingAmount },
        tx,
      );
      await writeAudit(tx, {
        actorId: userId,
        action: "shift.opened",
        entityType: "cash_shift",
        entityId: shift.id,
        changes: { openingAmount: shift.openingAmount },
      });
      return shift;
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Dos aperturas simultáneas: la segunda choca con el índice único parcial. Se lee quién ganó (la transacción ya terminó).
    const held = await cashRepo.findLocalOpenShift();
    if (!held) throw new ConflictError("La caja se acaba de abrir; intenta de nuevo");
    throw new ConflictError(held.userId === userId ? "Ya tienes un turno de caja abierto" : cashHeldByMessage(held.ownerName, held.openedAt));
  }
}

/** Cierra un turno ya bloqueado: lo mismo para el cierre del dueño y el de un supervisor, solo cambia el conteo y quién lo hace. */
async function closeLockedShift(
  tx: Executor,
  shift: { id: string; userId: string; openingAmount: number },
  closedBy: string,
  mode: CloseMode,
  counted: { cash: number; yape: number } | null,
) {
  const totals = await cashRepo.shiftTotals(shift.id, tx);
  const closing = closingValues({ opening: shift.openingAmount, ...totals }, counted);
  await cashRepo.updateShift(
    shift.id,
    { status: "CLOSED", closedAt: new Date(), closedBy, closeMode: mode, totalCash: totals.cashSales, totalYape: totals.yapeSales, ...closing.values },
    tx,
  );
  return closing;
}

export async function closeShift(userId: string, input: CloseShiftInput) {
  return db.transaction(async (tx) => {
    // El cierre se permite aunque el turno esté vencido: es justo lo que hay que hacer.
    const shift = await lockOpenShift(tx, userId, { allowStale: true });
    const closing = await closeLockedShift(tx, shift, userId, "NORMAL", { cash: input.countedCash, yape: input.countedYape });
    const result = { expectedCash: closing.expectedCash, expectedYape: closing.expectedYape, ...closing.differences! };
    await writeAudit(tx, {
      actorId: userId,
      action: "shift.closed",
      entityType: "cash_shift",
      entityId: shift.id,
      severity: result.difference === 0 ? "info" : "warning",
      changes: { counted: { cash: input.countedCash, yape: input.countedYape }, ...result },
    });
    return result;
  });
}

/** Un supervisor cierra el turno de otra persona: con su propio conteo o «sin cuadre» (nadie cuenta, y queda registrado). */
export async function forceCloseShift(actorId: string, shiftId: string, input: ForceCloseInput) {
  return db.transaction(async (tx) => {
    const shift = await cashRepo.lockShift(shiftId, tx);
    if (!shift) throw new NotFoundError("Turno no encontrado");
    if (shift.status !== "OPEN") throw new ConflictError("El turno ya está cerrado");

    const counted = input.mode === "COUNTED" ? { cash: input.countedCash, yape: input.countedYape } : null;
    const closing = await closeLockedShift(tx, shift, actorId, counted ? "FORCED_COUNTED" : "FORCED_NO_COUNT", counted);
    await writeAudit(tx, {
      actorId,
      action: "cash.shift_force_closed",
      entityType: "cash_shift",
      entityId: shift.id,
      severity: "warning",
      changes: { ownerId: shift.userId, mode: input.mode, ...(closing.differences ?? {}) },
    });
    return { mode: input.mode, expectedCash: closing.expectedCash, expectedYape: closing.expectedYape, ...(closing.differences ?? {}) };
  });
}

/** El turno abierto de todo el local. Los importes solo los ve un supervisor y solo si no es su propio turno. */
export async function getLocalOpenShift(userId: string, canSupervise: boolean) {
  const open = await cashRepo.findLocalOpenShift();
  if (!open) return null;
  const mine = open.userId === userId;
  const summary = canSupervise && !mine ? toSummary(open.openingAmount, await cashRepo.shiftTotals(open.id)) : undefined;
  return { id: open.id, ownerName: open.ownerName, openedAt: open.openedAt, stale: isShiftStale(open.openedAt), mine, ...(summary ? { openingAmount: open.openingAmount, summary } : {}) };
}

export async function addMovement(userId: string, input: MovementInput) {
  return db.transaction(async (tx) => {
    const shift = await lockOpenShift(tx, userId);
    const movement = await cashRepo.insertMovement(
      {
        shiftId: shift.id,
        userId,
        type: input.type,
        amount: input.amount,
        reason: input.reason,
      },
      tx,
    );
    await writeAudit(tx, {
      actorId: userId,
      action: input.type === "CASH_WITHDRAWAL" ? "cash.withdrawal" : "cash.exchange",
      entityType: "cash_shift",
      entityId: shift.id,
      changes: { amount: input.amount, movementId: movement.id },
    });
    return movement;
  });
}
