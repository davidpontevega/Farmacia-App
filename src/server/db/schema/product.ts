import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt, id, updatedAt } from "./_shared";
import { users } from "./user";

export const products = pgTable(
  "products",
  {
    id: id(),
    commercialName: text("commercial_name").notNull(),
    genericName: text("generic_name"),
    laboratory: text("laboratory"),
    category: text("category"),
    barcode: text("barcode").unique(),
    salePrice: integer("sale_price").notNull(),
    minStock: integer("min_stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("products_price_nonneg", sql`${t.salePrice} >= 0`)],
);
