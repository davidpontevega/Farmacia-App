import { and, count, eq, getTableColumns, ilike, inArray, or, sql } from "drizzle-orm";
import { normalize } from "@/lib/text";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { lotStock, productStock, products, type Product } from "@/server/db/schema";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export async function list(params: {
  q?: string;
  /** Cualquiera de estos nombres (sin tildes ni mayúsculas) en el nombre comercial o genérico. */
  names?: string[];
  page: number;
  pageSize: number;
  includeInactive: boolean;
  /** Hoy en Lima (`YYYY-MM-DD`): separa el stock vendible del vencido. */
  today: string;
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
    params.names?.length
      ? or(...params.names.flatMap((n) => {
          const like = `%${escapeLike(normalize(n))}%`;
          return [
            sql`translate(lower(${products.commercialName}), 'áéíóúüñ', 'aeiouun') like ${like}`,
            sql`translate(lower(coalesce(${products.genericName}, '')), 'áéíóúüñ', 'aeiouun') like ${like}`,
          ];
        }))
      : undefined,
  );

  // Próximo vencimiento: solo lotes con stock.
  const expiry = db
    .select({
      productId: lotStock.productId,
      nextExpiry: sql<string | null>`min(${lotStock.expiryDate}) filter (where ${lotStock.stock} > 0)`.as(
        "next_expiry",
      ),
      sellable: sql`coalesce(sum(${lotStock.stock}) filter (where ${lotStock.expiryDate} >= ${params.today}::date), 0)`
        .mapWith(Number)
        .as("sellable"),
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
        sellableStock: sql`coalesce(${expiry.sellable}, 0)`.mapWith(Number),
      })
      .from(products)
      .leftJoin(productStock, eq(productStock.productId, products.id))
      .leftJoin(expiry, eq(expiry.productId, products.id))
      .where(where)
      // En la consulta por síntoma, lo que tiene stock vendible va primero aunque haya más resultados que la página.
      .orderBy(...(params.names?.length ? [sql`(coalesce(${expiry.sellable}, 0) > 0) desc`] : []), products.commercialName, products.id)
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

/** Nombres de los productos activos, para emparejar descripciones de documentos en el navegador. */
export async function listNames(ex: Executor = db) {
  return ex
    .select({
      id: products.id,
      commercialName: products.commercialName,
      genericName: products.genericName,
      laboratory: products.laboratory,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(products.commercialName)
    .limit(10_000);
}

/** Categorías en uso (texto libre en `products.category`), sin repetir. */
export async function listCategories(ex: Executor = db) {
  const rows = await ex
    .selectDistinct({ category: products.category })
    .from(products)
    .where(sql`${products.category} is not null and ${products.category} <> ''`)
    .orderBy(products.category);
  return rows.map((r) => r.category as string);
}

export async function findActiveByIds(ids: string[], ex: Executor = db) {
  return ex
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.isActive, true)));
}
