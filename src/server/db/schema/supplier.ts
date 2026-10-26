import { pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";

export const suppliers = pgTable("suppliers", {
  id: id(),
  name: text("name").notNull(),
  // Nombre sin mayúsculas ni espacios repetidos: "HealTec  SAC" y "healtec sac" son el mismo.
  nameKey: text("name_key").notNull().unique(),
  createdAt: createdAt(),
});
