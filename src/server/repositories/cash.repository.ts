import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { cashMovements, cashShifts, sales } from "@/server/db/schema";

export async function findOpenShift(userId: string, ex: Executor = db) {
  const [row] = await ex
    .select()
    .from(cashShifts)
    .where(and(eq(cashShifts.userId, userId), eq(cashShifts.status, "OPEN")));
  return row;
}

/** Bloquea el turno hasta el fin de la transacción: serializa movimientos, ventas y cierre. */
export async function lockShift(shiftId: string, ex: Executor) {
  const [row] = await ex
    .select()
    .from(cashShifts)
    .where(eq(cashShifts.id, shiftId))
    .for("update");
  return row;
}

export async function insertShift(
  data: { userId: string; openingAmount: number },
  ex: Executor = db,
) {
  const [row] = await ex.insert(cashShifts).values(data).returning();
  return row;
}

export async function updateShift(
  id: string,
  data: Partial<typeof cashShifts.$inferInsert>,
  ex: Executor = db,
) {
  await ex.update(cashShifts).set(data).where(eq(cashShifts.id, id));
}

export async function insertMovement(
  data: typeof cashMovements.$inferInsert,
  ex: Executor = db,
) {
  const [row] = await ex.insert(cashMovements).values(data).returning();
  return row;
}

export async function movementsOfShift(shiftId: string, ex: Executor = db) {
  return ex
    .select({
      id: cashMovements.id,
      type: cashMovements.type,
      amount: cashMovements.amount,
      reason: cashMovements.reason,
      createdAt: cashMovements.createdAt,
    })
    .from(cashMovements)
    .where(eq(cashMovements.shiftId, shiftId))
    .orderBy(desc(cashMovements.createdAt));
}

/** Ventas completadas (las anuladas no cuentan) y movimientos del turno, agregados. */
export async function shiftTotals(shiftId: string, ex: Executor = db) {
  const [s] = await ex
    .select({
      cashSales: sql`coalesce(sum(${sales.cashAmount}), 0)`.mapWith(Number),
      yapeSales: sql`coalesce(sum(${sales.yapeAmount}), 0)`.mapWith(Number),
      salesCount: sql<number>`count(*)::int`,
    })
    .from(sales)
    .where(and(eq(sales.shiftId, shiftId), eq(sales.status, "COMPLETED")));

  const byType = await ex
    .select({
      type: cashMovements.type,
      total: sql`coalesce(sum(${cashMovements.amount}), 0)`.mapWith(Number),
    })
    .from(cashMovements)
    .where(eq(cashMovements.shiftId, shiftId))
    .groupBy(cashMovements.type);
  const total = (type: string) => byType.find((r) => r.type === type)?.total ?? 0;

  return {
    ...s,
    withdrawals: total("CASH_WITHDRAWAL"),
    exchanges: total("YAPE_TO_CASH_EXCHANGE"),
  };
}
