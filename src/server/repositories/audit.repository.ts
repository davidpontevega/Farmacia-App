import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { Executor } from "@/server/db/types";
import { auditLogs } from "@/server/db/schema";

/** Cuántas veces hizo `action` este usuario desde `since`. Sirve de límite de uso que sobrevive entre instancias. */
export async function countByActor(actorId: string, action: string, since: Date, ex: Executor = db) {
  const [row] = await ex
    .select({ n: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.actorId, actorId), eq(auditLogs.action, action), gte(auditLogs.createdAt, since)));
  return row?.n ?? 0;
}

/** Candado de transacción por usuario: dos peticiones simultáneas del mismo usuario se ponen en fila. */
export async function lockActor(actorId: string, ex: Executor) {
  await ex.execute(sql`select pg_advisory_xact_lock(hashtext(${actorId}))`);
}
