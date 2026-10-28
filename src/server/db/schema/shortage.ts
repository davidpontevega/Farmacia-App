import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt, id, shortageSourceEnum, shortageStatusEnum } from "./_shared";
import { products } from "./product";
import { users } from "./user";

/** Medicamento pedido que no se pudo atender (spec 017). Una fila por pedido; el conteo sale de agrupar por `nameKey`. */
export const shortages = pgTable(
  "shortages",
  {
    id: id(),
    /** Tal como se escribió o leyó. */
    name: text("name").notNull(),
    /** Normalizado (sin tildes ni mayúsculas): clave para agrupar. */
    nameKey: text("name_key").notNull(),
    quantity: integer("quantity").notNull(),
    source: shortageSourceEnum("source").notNull(),
    /** El producto existe en el catálogo pero no tenía stock. */
    productId: uuid("product_id").references(() => products.id),
    status: shortageStatusEnum("status").notNull().default("OPEN"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("shortages_quantity_range", sql`${t.quantity} between 1 and 9999`),
    check("shortages_name_length", sql`char_length(${t.name}) between 1 and 120`),
    index("shortages_status_key_idx").on(t.status, t.nameKey),
    index("shortages_user_key_idx").on(t.userId, t.nameKey, sql`${t.createdAt} desc`),
  ],
);
