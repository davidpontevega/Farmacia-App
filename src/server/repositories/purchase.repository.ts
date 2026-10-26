import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { purchaseItems, purchases, users } from "@/server/db/schema";
import { PURCHASES_LIST_LIMIT } from "@/modules/purchases/types";

export async function insertPurchase(data: typeof purchases.$inferInsert, ex: Executor) {
  const [row] = await ex.insert(purchases).values(data).returning();
  return row;
}

export async function insertItems(rows: (typeof purchaseItems.$inferInsert)[], ex: Executor) {
  await ex.insert(purchaseItems).values(rows);
}

/** Fecha de la compra: la del documento si se indicó; si no, el día del registro (hora de Lima). */
const documentDay = sql`coalesce(${purchases.documentDate}, (${purchases.createdAt} at time zone 'America/Lima')::date)`;

/** Rango de días por fecha del documento, ambos extremos inclusivos. */
export async function listByRange(range: { from: string; to: string }, ex: Executor = db) {
  return ex
    .select({
      id: purchases.id,
      createdAt: purchases.createdAt,
      documentDate: sql<string>`${documentDay}::text`,
      supplier: purchases.supplier,
      documentNumber: purchases.documentNumber,
      userName: users.name,
      total: purchases.total,
      itemCount: sql<number>`(select count(*)::int from ${purchaseItems} where ${purchaseItems.purchaseId} = ${purchases.id})`,
    })
    .from(purchases)
    .innerJoin(users, eq(users.id, purchases.userId))
    .where(and(gte(documentDay, sql`${range.from}::date`), lte(documentDay, sql`${range.to}::date`)))
    .orderBy(desc(documentDay), desc(purchases.createdAt))
    .limit(PURCHASES_LIST_LIMIT);
}
