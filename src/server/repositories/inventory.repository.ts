import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { KARDEX_LIMIT } from "@/lib/constants";
import type { Executor } from "@/server/db/types";
import {
  inventoryMovements,
  lotStock,
  lots,
  products,
  users,
} from "@/server/db/schema";

export async function lotsForProduct(productId: string, ex: Executor = db) {
  return ex
    .select({
      lotId: lotStock.lotId,
      lotNumber: lotStock.lotNumber,
      expiryDate: lotStock.expiryDate,
      purchasePrice: lots.purchasePrice,
      stock: lotStock.stock,
    })
    .from(lotStock)
    .innerJoin(lots, eq(lots.id, lotStock.lotId))
    .where(eq(lotStock.productId, productId))
    .orderBy(lotStock.expiryDate);
}

export async function insertLot(data: typeof lots.$inferInsert, ex: Executor = db) {
  const [row] = await ex.insert(lots).values(data).returning();
  return row;
}

/** Bloquea la fila del lote hasta el fin de la transacción: serializa ajustes y ventas. */
export async function lockLot(lotId: string, ex: Executor) {
  const [row] = await ex
    .select({ id: lots.id, productId: lots.productId })
    .from(lots)
    .where(eq(lots.id, lotId))
    .for("update");
  return row;
}

export async function stockOfLot(lotId: string, ex: Executor = db) {
  const [row] = await ex
    .select({ stock: sql<number>`coalesce(sum(${inventoryMovements.quantity}), 0)::int` })
    .from(inventoryMovements)
    .where(eq(inventoryMovements.lotId, lotId));
  return row.stock;
}

export async function insertMovement(
  data: typeof inventoryMovements.$inferInsert,
  ex: Executor = db,
) {
  const [row] = await ex.insert(inventoryMovements).values(data).returning();
  return row;
}

export async function kardex(filters: {
  productId?: string;
  from?: string;
  to?: string;
}) {
  const m = inventoryMovements;
  return db
    .select({
      id: m.id,
      createdAt: m.createdAt,
      productName: products.commercialName,
      lotNumber: lots.lotNumber,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      userName: users.name,
    })
    .from(m)
    .innerJoin(products, eq(products.id, m.productId))
    .innerJoin(lots, eq(lots.id, m.lotId))
    .innerJoin(users, eq(users.id, m.userId))
    .where(
      and(
        filters.productId ? eq(m.productId, filters.productId) : undefined,
        // Los días se interpretan en hora de Lima, igual que el resto del negocio.
        filters.from
          ? gte(m.createdAt, sql`(${filters.from}::date)::timestamp at time zone 'America/Lima'`)
          : undefined,
        filters.to
          ? lt(m.createdAt, sql`((${filters.to}::date + 1))::timestamp at time zone 'America/Lima'`)
          : undefined,
      ),
    )
    .orderBy(desc(m.createdAt))
    .limit(KARDEX_LIMIT);
}
