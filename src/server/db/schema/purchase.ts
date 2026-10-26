import { check, date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt, id } from "./_shared";
import { suppliers } from "./supplier";
import { users } from "./user";

export const purchases = pgTable(
  "purchases",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    // Nombre tal como se escribió; supplier_id apunta al proveedor reconocido.
    supplier: text("supplier"),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    documentNumber: text("document_number"),
    // Fecha del documento del proveedor; nulo = el día del registro.
    documentDate: date("document_date"),
    // Gastos sin stock (envío): ya incluidos en `total`.
    otherCharges: integer("other_charges").notNull().default(0),
    total: integer("total").notNull(),
    createdAt: createdAt(),
  },
  (t) => [check("purchases_other_charges_nonneg", sql`${t.otherCharges} >= 0`)],
);
