import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { cashMovementTypeEnum, createdAt, id } from "./_shared";
import { cashShifts } from "./cash-shift";
import { users } from "./user";

export const cashMovements = pgTable(
  "cash_movements",
  {
    id: id(),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => cashShifts.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: cashMovementTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("cash_movements_amount_positive", sql`${t.amount} > 0`),
    index("cash_movements_shift_idx").on(t.shiftId),
  ],
);
