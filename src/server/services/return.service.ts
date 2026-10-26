import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { availableOf, validateReturn } from "@/lib/returns";
import type { CreateReturnInput } from "@/modules/returns/schemas";
import * as cashRepo from "@/server/repositories/cash.repository";
import * as inventoryRepo from "@/server/repositories/inventory.repository";
import * as returnRepo from "@/server/repositories/return.repository";
import * as saleRepo from "@/server/repositories/sale.repository";
import { lockOpenShift } from "./cash.service";

export async function lookupByTicket(ticket: string) {
  const found = await returnRepo.findSalesByTicket(ticket.trim());
  if (found.length === 0) throw new NotFoundError("Venta no encontrada");
  if (found.length > 1) {
    throw new ConflictError("Hay varias ventas con ese número; escribe el ticket completo");
  }
  const sale = found[0];

  // Una venta anulada se muestra, pero sin líneas que devolver.
  const lines =
    sale.status === "VOIDED"
      ? []
      : (await returnRepo.linesWithReturned(sale.id))
          .map((l) => ({
            saleItemId: l.saleItemId,
            productName: l.productName,
            lotNumber: l.lotNumber,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            returned: l.returned,
            available: availableOf(l),
          }))
          .filter((l) => l.available > 0);

  return {
    sale: {
      id: sale.id,
      ticketNumber: sale.ticketNumber,
      createdAt: sale.createdAt,
      total: sale.total,
      status: sale.status,
    },
    lines,
  };
}

/**
 * Orden de bloqueos: venta -> turno. Es el mismo orden que `voidSale`, así una
 * devolución y una anulación de la misma venta no se bloquean entre sí.
 * El reembolso sale del efectivo del turno abierto de quien devuelve.
 */
export async function createReturn(userId: string, input: CreateReturnInput) {
  return db.transaction(async (tx) => {
    const sale = await saleRepo.lockSale(input.saleId, tx);
    if (!sale) throw new NotFoundError("Venta no encontrada");
    if (sale.status === "VOIDED") {
      throw new ConflictError("No se puede devolver una venta anulada");
    }

    const shift = await lockOpenShift(tx, userId);

    // Las líneas se leen después del bloqueo de la venta: ven las devoluciones ya confirmadas.
    const lines = await returnRepo.linesWithReturned(sale.id, tx);
    const checked = validateReturn(lines, input.items);
    if (!checked.ok) {
      throw checked.kind === "not_in_sale"
        ? new NotFoundError(checked.error)
        : new ConflictError(checked.error);
    }
    const lineById = new Map(lines.map((l) => [l.saleItemId, l]));

    const ret = await returnRepo.insertReturn(
      { saleId: sale.id, userId, reason: input.reason, refundedAmount: checked.refunded },
      tx,
    );
    await returnRepo.insertReturnItems(
      checked.items.map((i) => {
        const line = lineById.get(i.saleItemId)!;
        return {
          returnId: ret.id,
          saleItemId: i.saleItemId,
          productId: line.productId,
          lotId: line.lotId,
          quantity: i.quantity,
          unitPrice: line.unitPrice,
          productCondition: i.condition,
        };
      }),
      tx,
    );

    // Solo lo bueno vuelve al stock; lo dañado se reembolsa y se descarta.
    await inventoryRepo.insertMovements(
      checked.items
        .filter((i) => i.condition === "GOOD")
        .map((i) => {
          const line = lineById.get(i.saleItemId)!;
          return {
            productId: line.productId,
            lotId: line.lotId,
            userId,
            type: "RETURN" as const,
            quantity: i.quantity,
            reason: `Devolución venta ${sale.ticketNumber} — ${input.reason}`,
            referenceId: ret.id,
          };
        }),
      tx,
    );

    if (checked.refunded > 0) {
      await cashRepo.insertMovement(
        {
          shiftId: shift.id,
          userId,
          type: "CASH_REFUND",
          amount: checked.refunded,
          reason: `Devolución ${sale.ticketNumber}`,
        },
        tx,
      );
    }

    await writeAudit(tx, {
      actorId: userId,
      action: "return.created",
      entityType: "return",
      entityId: ret.id,
      changes: {
        ticketNumber: sale.ticketNumber,
        refundedAmount: checked.refunded,
        lines: checked.items.length,
      },
    });

    return { id: ret.id, ticketNumber: sale.ticketNumber, refundedAmount: checked.refunded };
  });
}
