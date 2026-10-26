import { check, index, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id, productConditionEnum } from "./_shared";
import { lots } from "./lot";
import { products } from "./product";
import { returns } from "./return";
import { saleItems } from "./sale-item";

export const returnItems = pgTable(
  "return_items",
  {
    id: id(),
    returnId: uuid("return_id")
      .notNull()
      .references(() => returns.id),
    // Línea de la venta que se devuelve: de ahí salen precio y lote.
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => saleItems.id),
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
    index("return_items_sale_item_idx").on(t.saleItemId),
  ],
);
