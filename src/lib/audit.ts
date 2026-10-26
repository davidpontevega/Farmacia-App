import type { Executor } from "@/server/db/types";
import { auditLogs } from "@/server/db/schema";

type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  severity?: "info" | "warning" | "error";
};

// Append-only. Pasar la transacción de la mutación para que ambas confirmen juntas.
// Nunca incluir contraseñas, tokens ni datos personales innecesarios en changes/metadata.
export async function writeAudit(tx: Executor, entry: AuditEntry) {
  await tx.insert(auditLogs).values(entry);
}
