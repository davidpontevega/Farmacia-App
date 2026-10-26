import { and, count, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { lotStock, productStock, products, type Product } from "@/server/db/schema";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export async function list(params: {
  q?: string;
  page: number;
  pageSize: number;
  includeInactive: boolean;
}) {
  const pattern = params.q ? `%${escapeLike(params.q)}%` : undefined;
  const where = and(
    params.includeInactive ? undefined : eq(products.isActive, true),
    pattern
      ? or(
          ilike(products.commercialName, pattern),
          ilike(products.genericName, pattern),
        )
      : undefined,
  );

  // Próximo vencimiento: solo lotes con stock.
  const expiry = db
    .select({
      productId: lotStock.productId,
      nextExpiry: sql<string | null>`min(${lotStock.expiryDate}) filter (where ${lotStock.stock} > 0)`.as(
        "next_expiry",
      ),
    })
    .from(lotStock)
    .groupBy(lotStock.productId)
    .as("expiry");

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        ...getTableColumns(products),
        stock: sql<number>`coalesce(${productStock.stock}, 0)`,
        nextExpiry: expiry.nextExpiry,
      })
      .from(products)
      .leftJoin(productStock, eq(productStock.productId, products.id))
      .leftJoin(expiry, eq(expiry.productId, products.id))
      .where(where)
      .orderBy(products.commercialName, products.id)
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: count() }).from(products).where(where),
  ]);
  return { items, total };
}

export async function findById(id: string, ex: Executor = db) {
  const [row] = await ex.select().from(products).where(eq(products.id, id));
  return row as Product | undefined;
}

export async function insert(data: typeof products.$inferInsert, ex: Executor = db) {
  const [row] = await ex.insert(products).values(data).returning();
  return row;
}

export async function update(
  id: string,
  data: Partial<typeof products.$inferInsert>,
  ex: Executor = db,
) {
  await ex.update(products).set(data).where(eq(products.id, id));
}
