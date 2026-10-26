import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, movementTypeEnum } from "./_shared";
import { lots } from "./lot";
import { products } from "./product";
import { users } from "./user";

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    lotId: uuid("lot_id")
      .notNull()
      .references(() => lots.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: movementTypeEnum("type").notNull(),
    // con signo: EXIT negativo, ENTRY/RETURN positivo
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull(),
    referenceId: uuid("reference_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("inventory_movements_lot_idx").on(t.lotId),
    index("inventory_movements_product_idx").on(t.productId),
  ],
);
