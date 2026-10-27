import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
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
  hasProof: sql<boolean>`${sales.proofPath} is not null`,
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

/** Cuántos días de constancia vencidos se procesan por corrida del cron. */
const PURGE_BATCH = 100;

/** Fija la ruta solo si aún no hay constancia. Devuelve false si otra subida llegó antes. */
export async function setProof(id: string, path: string, ex: Executor) {
  const rows = await ex
    .update(sales)
    .set({ proofPath: path, proofUploadedAt: new Date() })
    .where(and(eq(sales.id, id), isNull(sales.proofPath)))
    .returning({ id: sales.id });
  return rows.length > 0;
}

export async function expiredProofs(cutoff: Date, ex: Executor = db) {
  return ex
    .select({ id: sales.id, proofPath: sales.proofPath })
    .from(sales)
    .where(and(lt(sales.proofUploadedAt, cutoff), sql`${sales.proofPath} is not null`))
    .orderBy(sales.proofUploadedAt)
    .limit(PURGE_BATCH);
}

export async function clearProof(id: string, ex: Executor) {
  await ex.update(sales).set({ proofPath: null }).where(eq(sales.id, id));
}

export async function proofPathOf(id: string, ex: Executor = db) {
  const [row] = await ex.select({ path: sales.proofPath }).from(sales).where(eq(sales.id, id));
  return row?.path ?? null;
}
