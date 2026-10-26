import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { isUniqueViolation } from "@/server/db/errors";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/errors";
import { canAdjust } from "@/lib/stock";
import type { AdjustmentInput, CreateLotInput } from "@/modules/inventory/schemas";
import * as inventoryRepo from "@/server/repositories/inventory.repository";
import * as productRepo from "@/server/repositories/product.repository";

/**
 * Lote + movimiento ENTRY + auditoría dentro de la transacción del llamador.
 * Reutilizable por compras, que registra varios lotes en una sola transacción.
 */
export async function createLotIn(
  tx: Executor,
  actorId: string,
  productId: string,
  input: CreateLotInput,
  reason = "Alta de lote",
) {
  const lot = await inventoryRepo.insertLot(
    {
      productId,
      lotNumber: input.lotNumber,
      expiryDate: input.expiryDate,
      purchasePrice: input.purchasePrice,
      initialQuantity: input.quantity,
      createdBy: actorId,
    },
    tx,
  );
  await inventoryRepo.insertMovement(
    {
      productId,
      lotId: lot.id,
      userId: actorId,
      type: "ENTRY",
      quantity: input.quantity,
      reason,
      referenceId: lot.id,
    },
    tx,
  );
  await writeAudit(tx, {
    actorId,
    action: "lot.created",
    entityType: "lot",
    entityId: lot.id,
    changes: { productId, lotNumber: input.lotNumber, quantity: input.quantity },
  });
  return lot;
}

export async function createLot(actorId: string, productId: string, input: CreateLotInput) {
  if (!(await productRepo.findById(productId))) {
    throw new NotFoundError("Producto no encontrado");
  }
  try {
    return await db.transaction((tx) => createLotIn(tx, actorId, productId, input));
  } catch (err) {
    throw isUniqueViolation(err)
      ? new ConflictError("Ese número de lote ya existe para el producto")
      : err;
  }
}

/**
 * El bloqueo del lote hace que el segundo ajuste concurrente espere, y su lectura
 * de stock (sentencia nueva) ya vea el movimiento confirmado por el primero.
 */
export async function adjustStock(actorId: string, input: AdjustmentInput) {
  return db.transaction(async (tx) => {
    const lot = await inventoryRepo.lockLot(input.lotId, tx);
    if (!lot) throw new NotFoundError("Lote no encontrado");

    const current = await inventoryRepo.stockOfLot(lot.id, tx);
    if (!canAdjust(current, input.quantity)) {
      throw new BusinessRuleError(`Stock insuficiente: el lote tiene ${current} unidades`);
    }

    await inventoryRepo.insertMovement(
      {
        productId: lot.productId,
        lotId: lot.id,
        userId: actorId,
        type: "ADJUSTMENT",
        quantity: input.quantity,
        reason: input.reason,
      },
      tx,
    );
    await writeAudit(tx, {
      actorId,
      action: "inventory.adjusted",
      entityType: "lot",
      entityId: lot.id,
      changes: { delta: input.quantity, from: current, to: current + input.quantity },
    });
    return { stock: current + input.quantity };
  });
}
