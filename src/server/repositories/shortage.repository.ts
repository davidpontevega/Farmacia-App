import { and, count, desc, eq, gte, inArray, max, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { shortages, users } from "@/server/db/schema";
import type { ShortageGroup, ShortageStatus } from "@/lib/shortages";

const LIST_LIMIT = 500;

type NewShortage = Pick<typeof shortages.$inferInsert, "name" | "nameKey" | "quantity" | "source" | "productId">;

const sameItem = (nameKey: string, productId: string | null | undefined) => `${nameKey}|${productId ?? ""}`;

/** Inserta los ítems que el mismo usuario no anotó ya desde `since` (mismo nombre y mismo producto). Devuelve cuántos entraron. */
export async function insertNew(userId: string, rows: NewShortage[], since: Date, ex: Executor) {
  const recent = await ex
    .select({ nameKey: shortages.nameKey, productId: shortages.productId })
    .from(shortages)
    .where(
      and(
        eq(shortages.userId, userId),
        gte(shortages.createdAt, since),
        inArray(shortages.nameKey, [...new Set(rows.map((r) => r.nameKey))]),
      ),
    );
  const seen = new Set(recent.map((r) => sameItem(r.nameKey, r.productId)));
  const fresh = rows.filter((r) => !seen.has(sameItem(r.nameKey, r.productId)));
  if (fresh.length > 0) await ex.insert(shortages).values(fresh.map((r) => ({ ...r, userId })));
  return fresh.length;
}

/** Agrupado por nombre normalizado: más pedidos primero y, de ahí, el pedido más reciente. */
export async function listGrouped(status: ShortageStatus, ex: Executor = db): Promise<ShortageGroup[]> {
  const resolver = alias(users, "resolver");
  const rows = await ex
    .select({
      nameKey: shortages.nameKey,
      name: sql<string>`(array_agg(${shortages.name} order by ${shortages.createdAt} desc))[1]`,
      timesRequested: sql<number>`count(*)::int`,
      totalQuantity: sql<number>`sum(${shortages.quantity})::int`,
      lastAt: max(shortages.createdAt),
      lastBy: sql<string>`(array_agg(${users.name} order by ${shortages.createdAt} desc))[1]`,
      resolvedAt: max(shortages.resolvedAt),
      resolvedBy: sql<string | null>`(array_agg(${resolver.name} order by ${shortages.resolvedAt} desc nulls last))[1]`,
    })
    .from(shortages)
    .innerJoin(users, eq(users.id, shortages.userId))
    .leftJoin(resolver, eq(resolver.id, shortages.resolvedBy))
    .where(eq(shortages.status, status))
    .groupBy(shortages.nameKey)
    .orderBy(desc(count()), desc(max(shortages.createdAt)))
    .limit(LIST_LIMIT);
  const iso = (v: unknown) => (v ? new Date(v as string | Date).toISOString() : null);
  return rows.map((r) => ({ ...r, lastAt: iso(r.lastAt)!, resolvedAt: iso(r.resolvedAt) }));
}

/** Cambia a todos los pedidos abiertos de ese nombre. Devuelve cuántas filas cambió. */
export async function resolveOpenByKey(nameKey: string, status: "ORDERED" | "DISMISSED", userId: string, ex: Executor) {
  const rows = await ex
    .update(shortages)
    .set({ status, resolvedAt: new Date(), resolvedBy: userId })
    .where(and(eq(shortages.nameKey, nameKey), eq(shortages.status, "OPEN")))
    .returning({ id: shortages.id });
  return rows.length;
}

/** Pasa a «Recibido» los pedidos abiertos o ya marcados «Pedido» de ese nombre, ligados a la compra. Devuelve cuántas filas cambió. */
export async function markReceived(nameKey: string, purchaseId: string, userId: string, ex: Executor) {
  const rows = await ex
    .update(shortages)
    .set({ status: "RECEIVED", purchaseId, resolvedAt: new Date(), resolvedBy: userId })
    .where(and(eq(shortages.nameKey, nameKey), inArray(shortages.status, ["OPEN", "ORDERED"])))
    .returning({ id: shortages.id });
  return rows.length;
}
