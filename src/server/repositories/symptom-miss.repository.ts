import { desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { symptomMisses } from "@/server/db/schema";
import { MISS_LIST_LIMIT } from "@/lib/symptom-misses";

/** Una fila por texto: repetirlo suma 1 y actualiza la última vez. */
export async function record(query: string, ex: Executor = db) {
  await ex
    .insert(symptomMisses)
    .values({ query })
    .onConflictDoUpdate({ target: symptomMisses.query, set: { count: sql`${symptomMisses.count} + 1`, lastAt: sql`now()` } });
}

/** Las más repetidas desde `since`, con la más reciente primero a igual número de veces. */
export async function listSince(since: Date, ex: Executor = db) {
  return ex
    .select({ id: symptomMisses.id, query: symptomMisses.query, count: symptomMisses.count, lastAt: symptomMisses.lastAt })
    .from(symptomMisses)
    .where(gte(symptomMisses.lastAt, since))
    .orderBy(desc(symptomMisses.count), desc(symptomMisses.lastAt))
    .limit(MISS_LIST_LIMIT);
}

export async function remove(id: string, ex: Executor = db) {
  const rows = await ex.delete(symptomMisses).where(eq(symptomMisses.id, id)).returning({ id: symptomMisses.id });
  return rows.length > 0;
}

/** Borra las de última vez anterior a `cutoff`. Devuelve cuántas. */
export async function purgeBefore(cutoff: Date, ex: Executor = db) {
  const rows = await ex.delete(symptomMisses).where(lt(symptomMisses.lastAt, cutoff)).returning({ id: symptomMisses.id });
  return rows.length;
}
