import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { todayLima } from "@/lib/dates";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors";
import {
  allocateFefo,
  cartTotal,
  formatTicket,
  resolvePayment,
} from "@/lib/sales";
import type { CreateSaleInput } from "@/modules/sales/schemas";
import * as cashRepo from "@/server/repositories/cash.repository";
import * as inventoryRepo from "@/server/repositories/inventory.repository";
import * as productRepo from "@/server/repositories/product.repository";
import * as returnRepo from "@/server/repositories/return.repository";
import * as saleRepo from "@/server/repositories/sale.repository";
import { lockOpenShift } from "./cash.service";

type Line = {
  productId: string;
  lotId: string;
  quantity: number;
  unitPrice: number;
};

/**
 * Venta completa en una transacción: si algo falla (stock, precios, pago) no queda nada.
 * Orden de bloqueos: turno -> lotes (productos por id, lotes por vencimiento e id).
 * Es el mismo orden en toda venta, así dos ventas simultáneas no se bloquean entre sí.
 */
export async function createSale(userId: string, input: CreateSaleInput) {
  return db.transaction(async (tx) => {
    const shift = await lockOpenShift(tx, userId);

    // Un producto repetido en el carrito suma sus cantidades.
    const qtyByProduct = new Map<string, number>();
    for (const item of input.items) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
    }
    const productIds = [...qtyByProduct.keys()].sort();

    const found = await productRepo.findActiveByIds(productIds, tx);
    if (found.length !== productIds.length) {
      throw new NotFoundError("Un producto del carrito no existe o está inactivo");
    }
    const byId = new Map(found.map((p) => [p.id, p]));

    // El precio lo pone el servidor; el cliente solo confirma el total que vio.
    const total = cartTotal(
      productIds.map((id) => ({ unitPrice: byId.get(id)!.salePrice, quantity: qtyByProduct.get(id)! })),
    );
    if (total !== input.expectedTotal) {
      throw new ConflictError("Los precios cambiaron; revisa el carrito");
    }

    const payment = resolvePayment({
      method: input.paymentMethod,
      total,
      cashTendered: input.cashTendered,
      yapeAmount: input.yapeAmount,
    });
    if (!payment.ok) throw new BusinessRuleError(payment.error);

    const today = todayLima();
    const lines: Line[] = [];
    for (const productId of productIds) {
      const product = byId.get(productId)!;
      const quantity = qtyByProduct.get(productId)!;

      const lotIds = await inventoryRepo.lockFefoLots(productId, today, tx);
      // Stock leído después del lock, en una sentencia nueva: ve lo que otra venta confirmó.
      const stocks = await inventoryRepo.stockByLots(lotIds, tx);
      const allocation = allocateFefo(
        lotIds.map((lotId) => ({ lotId, stock: stocks.get(lotId) ?? 0 })),
        quantity,
      );
      if (!allocation) {
        const available = [...stocks.values()].reduce((a, b) => a + Math.max(b, 0), 0);
        throw new ConflictError(
          `Stock insuficiente: ${product.commercialName} (disponible ${available})`,
        );
      }
      for (const a of allocation) {
        lines.push({ productId, lotId: a.lotId, quantity: a.quantity, unitPrice: product.salePrice });
      }
    }

    const ticketNumber = formatTicket(await saleRepo.nextTicketNumber(tx));
    const sale = await saleRepo.insertSale(
      {
        userId,
        shiftId: shift.id,
        ticketNumber,
        subtotal: total,
        discount: 0,
        total,
        paymentMethod: input.paymentMethod,
        cashAmount: payment.cashAmount,
        yapeAmount: payment.yapeAmount,
      },
      tx,
    );
    await saleRepo.insertItems(
      lines.map((l) => ({
        saleId: sale.id,
        productId: l.productId,
        lotId: l.lotId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        subtotal: l.quantity * l.unitPrice,
      })),
      tx,
    );
    await inventoryRepo.insertMovements(
      lines.map((l) => ({
        productId: l.productId,
        lotId: l.lotId,
        userId,
        type: "EXIT" as const,
        quantity: -l.quantity,
        reason: `Venta ${ticketNumber}`,
        referenceId: sale.id,
      })),
      tx,
    );
    await writeAudit(tx, {
      actorId: userId,
      action: "sale.created",
      entityType: "sale",
      entityId: sale.id,
      changes: {
        ticketNumber,
        total,
        paymentMethod: input.paymentMethod,
        lines: lines.length,
      },
    });

    return {
      id: sale.id,
      ticketNumber,
      total,
      paymentMethod: sale.paymentMethod,
      cashAmount: payment.cashAmount,
      yapeAmount: payment.yapeAmount,
      change: payment.change,
      createdAt: sale.createdAt,
    };
  });
}

/**
 * Anula y devuelve el stock a cada lote. Bloquea la venta (no se anula dos veces a la vez)
 * y su turno (anular y cerrar el turno no se pisan).
 */
export async function voidSale(actorId: string, saleId: string) {
  await db.transaction(async (tx) => {
    const sale = await saleRepo.lockSale(saleId, tx);
    if (!sale) throw new NotFoundError("Venta no encontrada");
    if (sale.status === "VOIDED") throw new ConflictError("La venta ya está anulada");
    // Con la venta bloqueada, una devolución concurrente ya confirmó o espera detrás.
    if (await returnRepo.hasReturns(sale.id, tx)) {
      throw new ConflictError("La venta tiene devoluciones; no se puede anular");
    }

    await cashRepo.lockShift(sale.shiftId, tx);

    const items = await saleRepo.itemsOf(sale.id, tx);
    await inventoryRepo.insertMovements(
      items.map((i) => ({
        productId: i.productId,
        lotId: i.lotId,
        userId: actorId,
        type: "RETURN" as const,
        quantity: i.quantity,
        reason: `Anulación venta ${sale.ticketNumber}`,
        referenceId: sale.id,
      })),
      tx,
    );
    await saleRepo.markVoided(sale.id, tx);
    await writeAudit(tx, {
      actorId,
      action: "sale.voided",
      entityType: "sale",
      entityId: sale.id,
      severity: "warning",
      changes: { ticketNumber: sale.ticketNumber, total: sale.total },
    });
  });
}
