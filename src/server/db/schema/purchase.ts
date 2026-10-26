import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";
import { users } from "./user";

export const purchases = pgTable("purchases", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  supplier: text("supplier"),
  documentNumber: text("document_number"),
  total: integer("total").notNull(),
  createdAt: createdAt(),
});
