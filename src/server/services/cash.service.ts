import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { isUniqueViolation } from "@/server/db/errors";
import { writeAudit } from "@/lib/audit";
import { closeDifferences, expectedCash, expectedYape } from "@/lib/cash";
import { ConflictError } from "@/lib/errors";
import type {
  CloseShiftInput,
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
export async function lockOpenShift(tx: Executor, userId: string) {
  const open = await cashRepo.findOpenShift(userId, tx);
  if (!open) throw new ConflictError(NO_OPEN_SHIFT);
  const locked = await cashRepo.lockShift(open.id, tx);
  if (locked.status !== "OPEN") throw new ConflictError(NO_OPEN_SHIFT);
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
    shift: { id: shift.id, openingAmount: shift.openingAmount, openedAt: shift.openedAt },
    summary: toSummary(shift.openingAmount, totals),
    movements,
  };
}

export async function openShift(userId: string, input: OpenShiftInput) {
  try {
    return await db.transaction(async (tx) => {
      if (await cashRepo.findOpenShift(userId, tx)) {
        throw new ConflictError("Ya tienes un turno de caja abierto");
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
    // Dos aperturas simultáneas: la segunda choca con el índice único parcial.
    throw isUniqueViolation(err) ? new ConflictError("Ya tienes un turno de caja abierto") : err;
  }
}

export async function closeShift(userId: string, input: CloseShiftInput) {
  return db.transaction(async (tx) => {
    const shift = await lockOpenShift(tx, userId);
    const totals = await cashRepo.shiftTotals(shift.id, tx);
    const result = closeDifferences(
      { opening: shift.openingAmount, ...totals },
      { cash: input.countedCash, yape: input.countedYape },
    );

    await cashRepo.updateShift(
      shift.id,
      {
        status: "CLOSED",
        closedAt: new Date(),
        countedCash: input.countedCash,
        countedYape: input.countedYape,
        totalCash: totals.cashSales,
        totalYape: totals.yapeSales,
        systemAmount: result.expectedCash + result.expectedYape,
        closingAmount: input.countedCash + input.countedYape,
        difference: result.difference,
      },
      tx,
    );
    await writeAudit(tx, {
      actorId: userId,
      action: "shift.closed",
      entityType: "cash_shift",
      entityId: shift.id,
      severity: result.difference === 0 ? "info" : "warning",
      changes: {
        counted: { cash: input.countedCash, yape: input.countedYape },
        ...result,
      },
    });
    return result;
  });
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
