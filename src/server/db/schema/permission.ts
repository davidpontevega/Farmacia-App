import { pgTable, text } from "drizzle-orm/pg-core";
import { id } from "./_shared";

export const permissions = pgTable("permissions", {
  id: id(),
  code: text("code").notNull().unique(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  description: text("description"),
});
