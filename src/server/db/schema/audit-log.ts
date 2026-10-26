import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt, id, severityEnum } from "./_shared";
import { users } from "./user";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    changes: jsonb("changes"),
    metadata: jsonb("metadata"),
    severity: severityEnum("severity").notNull().default("info"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorId, sql`${t.createdAt} desc`),
    index("audit_logs_created_idx").on(sql`${t.createdAt} desc`),
  ],
);
