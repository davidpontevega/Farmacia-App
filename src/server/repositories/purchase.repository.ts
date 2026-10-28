import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { lots, products, purchaseItems, purchases, shortages, users } from "@/server/db/schema";
import { sortPurchaseItems } from "@/lib/purchases";
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

/** Una compra con sus ítems (producto y lote) y los faltantes que cubrió; `undefined` si no existe. */
export async function findWithItems(id: string, ex: Executor = db) {
  const [purchase] = await ex
    .select({
      id: purchases.id,
      createdAt: purchases.createdAt,
      documentDate: sql<string>`${documentDay}::text`,
      supplier: purchases.supplier,
      documentNumber: purchases.documentNumber,
      userName: users.name,
      otherCharges: purchases.otherCharges,
      total: purchases.total,
    })
    .from(purchases)
    .innerJoin(users, eq(users.id, purchases.userId))
    .where(eq(purchases.id, id));
  if (!purchase) return undefined;

  const [items, covered] = await Promise.all([
    ex
      .select({
        id: purchaseItems.id,
        productName: products.commercialName,
        genericName: products.genericName,
        lotNumber: lots.lotNumber,
        expiryDate: sql<string>`${lots.expiryDate}::text`,
        quantity: purchaseItems.quantity,
        purchasePrice: purchaseItems.purchasePrice,
        salePrice: purchaseItems.salePrice,
      })
      .from(purchaseItems)
      .innerJoin(products, eq(products.id, purchaseItems.productId))
      .innerJoin(lots, eq(lots.id, purchaseItems.lotId))
      .where(eq(purchaseItems.purchaseId, id)),
    ex.select({ name: shortages.name, quantity: shortages.quantity }).from(shortages).where(eq(shortages.purchaseId, id)).orderBy(shortages.name),
  ]);

  return { ...purchase, items: sortPurchaseItems(items), shortages: covered };
}
