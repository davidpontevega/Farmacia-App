import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { id } from "./_shared";

export const roles = pgTable("roles", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
});
