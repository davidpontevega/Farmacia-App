import { desc, and, eq, gte, ilike, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import {
  lots,
  products,
  returnItems,
  returns,
  saleItems,
  sales,
  users,
} from "@/server/db/schema";
import { LOOKUP_DAYS, RETURNS_LIST_LIMIT } from "@/modules/returns/types";

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
const recent = () => gte(sales.createdAt, sql`now() - ${`${LOOKUP_DAYS} days`}::interval`);

/**
 * Venta por ticket en los últimos 90 días: primero exacto; si no, por sufijo.
 * Devuelve hasta 2 filas del sufijo para poder avisar de que es ambiguo.
 */
export async function findSalesByTicket(ticket: string, ex: Executor = db) {
  const exact = await ex
    .select()
    .from(sales)
    .where(and(recent(), eq(sql`lower(${sales.ticketNumber})`, ticket.toLowerCase())));
  if (exact.length > 0) return exact;

  return ex
    .select()
    .from(sales)
    .where(and(recent(), ilike(sales.ticketNumber, `%${escapeLike(ticket)}`)))
    .orderBy(desc(sales.createdAt))
    .limit(2);
}

/** Líneas de una venta con producto, lote y unidades ya devueltas. */
export async function linesWithReturned(saleId: string, ex: Executor = db) {
  const lines = await ex
    .select({
      saleItemId: saleItems.id,
      productId: saleItems.productId,
      lotId: saleItems.lotId,
      productName: products.commercialName,
      lotNumber: lots.lotNumber,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
    })
    .from(saleItems)
    .innerJoin(products, eq(products.id, saleItems.productId))
    .innerJoin(lots, eq(lots.id, saleItems.lotId))
    .where(eq(saleItems.saleId, saleId));
  if (lines.length === 0) return [];

  const returned = await ex
    .select({
      saleItemId: returnItems.saleItemId,
      quantity: sql`coalesce(sum(${returnItems.quantity}), 0)`.mapWith(Number),
    })
    .from(returnItems)
    .where(
      inArray(
        returnItems.saleItemId,
        lines.map((l) => l.saleItemId),
      ),
    )
    .groupBy(returnItems.saleItemId);
  const byLine = new Map(returned.map((r) => [r.saleItemId, r.quantity]));

  return lines.map((l) => ({ ...l, returned: byLine.get(l.saleItemId) ?? 0 }));
}

export async function insertReturn(data: typeof returns.$inferInsert, ex: Executor) {
  const [row] = await ex.insert(returns).values(data).returning();
  return row;
}

export async function insertReturnItems(rows: (typeof returnItems.$inferInsert)[], ex: Executor) {
  await ex.insert(returnItems).values(rows);
}

export async function hasReturns(saleId: string, ex: Executor) {
  const [row] = await ex
    .select({ id: returns.id })
    .from(returns)
    .where(eq(returns.saleId, saleId))
    .limit(1);
  return !!row;
}

/** Rango de días en hora de Lima, ambos extremos inclusivos. */
export async function listByRange(range: { from: string; to: string }, ex: Executor = db) {
  return ex
    .select({
      id: returns.id,
      createdAt: returns.createdAt,
      ticketNumber: sales.ticketNumber,
      userName: users.name,
      reason: returns.reason,
      refundedAmount: returns.refundedAmount,
    })
    .from(returns)
    .innerJoin(sales, eq(sales.id, returns.saleId))
    .innerJoin(users, eq(users.id, returns.userId))
    .where(
      and(
        gte(returns.createdAt, sql`(${range.from}::date)::timestamp at time zone 'America/Lima'`),
        lt(returns.createdAt, sql`((${range.to}::date + 1))::timestamp at time zone 'America/Lima'`),
      ),
    )
    .orderBy(desc(returns.createdAt))
    .limit(RETURNS_LIST_LIMIT);
}
