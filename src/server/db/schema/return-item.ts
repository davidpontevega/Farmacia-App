import { check, index, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id, productConditionEnum } from "./_shared";
import { lots } from "./lot";
import { products } from "./product";
import { returns } from "./return";

export const returnItems = pgTable(
  "return_items",
  {
    id: id(),
    returnId: uuid("return_id")
      .notNull()
      .references(() => returns.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    productCondition: productConditionEnum("product_condition").notNull(),
  },
  (t) => [
    check("return_items_quantity_positive", sql`${t.quantity} > 0`),
    check("return_items_price_nonneg", sql`${t.unitPrice} >= 0`),
    index("return_items_return_idx").on(t.returnId),
  ],
);
