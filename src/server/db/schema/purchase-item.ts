import { check, index, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id } from "./_shared";
import { lots } from "./lot";
import { products } from "./product";
import { purchases } from "./purchase";

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: id(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    quantity: integer("quantity").notNull(),
    purchasePrice: integer("purchase_price").notNull(),
    salePrice: integer("sale_price"),
  },
  (t) => [
    check("purchase_items_quantity_positive", sql`${t.quantity} > 0`),
    check("purchase_items_price_nonneg", sql`${t.purchasePrice} >= 0`),
    index("purchase_items_purchase_idx").on(t.purchaseId),
  ],
);
