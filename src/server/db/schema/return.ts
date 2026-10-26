import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";
import { sales } from "./sale";
import { users } from "./user";

export const returns = pgTable(
  "returns",
  {
    id: id(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    refundedAmount: integer("refunded_amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("returns_sale_idx").on(t.saleId)],
);
