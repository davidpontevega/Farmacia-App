import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";

export const users = pgTable("users", {
  id: id(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
