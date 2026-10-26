import { check, index, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id } from "./_shared";
import { lots } from "./lot";
import { products } from "./product";
import { sales } from "./sale";

export const saleItems = pgTable(
  "sale_items",
  {
    id: id(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
  },
  (t) => [
    check("sale_items_quantity_positive", sql`${t.quantity} > 0`),
    check("sale_items_price_nonneg", sql`${t.unitPrice} >= 0`),
    check("sale_items_subtotal_matches", sql`${t.subtotal} = ${t.quantity} * ${t.unitPrice}`),
    index("sale_items_sale_idx").on(t.saleId),
  ],
);
