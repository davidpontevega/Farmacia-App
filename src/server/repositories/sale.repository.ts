import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { lots, products, saleItems, sales, users } from "@/server/db/schema";
import { SALES_LIST_LIMIT } from "@/modules/sales/types";

export async function nextTicketNumber(ex: Executor) {
  const result = await ex.execute(sql`select nextval('ticket_seq') as n`);
  return Number((result.rows[0] as { n: string }).n);
}

export async function insertSale(data: typeof sales.$inferInsert, ex: Executor) {
  const [row] = await ex.insert(sales).values(data).returning();
  return row;
}

export async function insertItems(rows: (typeof saleItems.$inferInsert)[], ex: Executor) {
  await ex.insert(saleItems).values(rows);
}

const summaryColumns = {
  id: sales.id,
  ticketNumber: sales.ticketNumber,
  createdAt: sales.createdAt,
  total: sales.total,
  paymentMethod: sales.paymentMethod,
  cashAmount: sales.cashAmount,
  yapeAmount: sales.yapeAmount,
  status: sales.status,
  userId: sales.userId,
  shiftId: sales.shiftId,
  userName: users.name,
};

export async function findWithItems(id: string, ex: Executor = db) {
  const [sale] = await ex
    .select(summaryColumns)
    .from(sales)
    .innerJoin(users, eq(users.id, sales.userId))
    .where(eq(sales.id, id));
  if (!sale) return undefined;

  const items = await ex
    .select({
      productName: products.commercialName,
      lotNumber: lots.lotNumber,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      subtotal: saleItems.subtotal,
    })
    .from(saleItems)
    .innerJoin(products, eq(products.id, saleItems.productId))
    .innerJoin(lots, eq(lots.id, saleItems.lotId))
    .where(eq(saleItems.saleId, id));
  return { ...sale, items };
}

/** Líneas con producto y lote, para devolver el stock al anular. */
export async function itemsOf(saleId: string, ex: Executor) {
  return ex
    .select({
      productId: saleItems.productId,
      lotId: saleItems.lotId,
      quantity: saleItems.quantity,
    })
    .from(saleItems)
    .where(eq(saleItems.saleId, saleId));
}

export async function listByShift(shiftId: string, ex: Executor = db) {
  return ex
    .select(summaryColumns)
    .from(sales)
    .innerJoin(users, eq(users.id, sales.userId))
    .where(eq(sales.shiftId, shiftId))
    .orderBy(desc(sales.createdAt));
}

/** Rango de días en hora de Lima: `from` inclusivo, `to` inclusivo (hasta el fin del día). */
export async function listByRange(range: { from: string; to: string }, ex: Executor = db) {
  return ex
    .select(summaryColumns)
    .from(sales)
    .innerJoin(users, eq(users.id, sales.userId))
    .where(
      and(
        gte(sales.createdAt, sql`(${range.from}::date)::timestamp at time zone 'America/Lima'`),
        lt(sales.createdAt, sql`((${range.to}::date + 1))::timestamp at time zone 'America/Lima'`),
      ),
    )
    .orderBy(desc(sales.createdAt))
    .limit(SALES_LIST_LIMIT);
}

/** Bloquea la venta hasta el fin de la transacción: evita anularla dos veces a la vez. */
export async function lockSale(id: string, ex: Executor) {
  const [row] = await ex.select().from(sales).where(eq(sales.id, id)).for("update");
  return row;
}

export async function markVoided(id: string, ex: Executor) {
  await ex.update(sales).set({ status: "VOIDED" }).where(eq(sales.id, id));
}
