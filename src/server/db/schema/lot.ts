import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";
import { products } from "./product";
import { users } from "./user";

export const lots = pgTable(
  "lots",
  {
    id: id(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    lotNumber: text("lot_number").notNull(),
    expiryDate: date("expiry_date").notNull(),
    purchasePrice: integer("purchase_price").notNull(),
    initialQuantity: integer("initial_quantity").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("lots_product_lot_unique").on(t.productId, t.lotNumber),
    index("lots_fefo_idx").on(t.productId, t.expiryDate),
  ],
);
