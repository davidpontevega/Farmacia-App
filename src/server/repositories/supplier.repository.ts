import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { nameKey } from "@/lib/purchases";
import { products, supplierProducts, suppliers, type Supplier } from "@/server/db/schema";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

/** Proveedor por nombre (sin distinguir mayúsculas ni espacios repetidos); se crea si no existe. */
export async function findOrCreate(name: string, ex: Executor): Promise<Supplier> {
  const key = nameKey(name);
  const find = async () => (await ex.select().from(suppliers).where(eq(suppliers.nameKey, key)))[0];

  const existing = await find();
  if (existing) return existing;
  const [created] = await ex
    .insert(suppliers)
    .values({ name: name.trim().replace(/\s+/g, " "), nameKey: key })
    .onConflictDoNothing()
    .returning();
  // Si otra compra lo creó a la vez, el insert no devuelve fila: se lee el que ganó.
  return created ?? (await find());
}

export async function search(q: string, ex: Executor = db) {
  const pattern = `%${escapeLike(q.trim())}%`;
  return ex
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(ilike(suppliers.name, pattern))
    .orderBy(suppliers.name)
    .limit(20);
}

export async function linksOf(supplierId: string, ex: Executor = db) {
  return ex
    .select({
      supplierCode: supplierProducts.supplierCode,
      productId: supplierProducts.productId,
      productName: products.commercialName,
      unitsPerPackage: supplierProducts.unitsPerPackage,
    })
    .from(supplierProducts)
    .innerJoin(products, eq(products.id, supplierProducts.productId))
    .where(and(eq(supplierProducts.supplierId, supplierId), eq(products.isActive, true)));
}

/** Guarda lo aprendido; si el código ya existía, lo apunta al producto y unidades más recientes. */
export async function upsertLinks(
  links: { supplierId: string; supplierCode: string; productId: string; unitsPerPackage: number }[],
  ex: Executor,
) {
  if (links.length === 0) return;
  await ex
    .insert(supplierProducts)
    .values(links)
    .onConflictDoUpdate({
      target: [supplierProducts.supplierId, supplierProducts.supplierCode],
      set: {
        productId: sql`excluded.product_id`,
        unitsPerPackage: sql`excluded.units_per_package`,
      },
    });
}
