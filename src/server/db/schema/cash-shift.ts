import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id, shiftStatusEnum } from "./_shared";
import { users } from "./user";

export const cashShifts = pgTable(
  "cash_shifts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    openingAmount: integer("opening_amount").notNull(),
    closingAmount: integer("closing_amount"),
    countedCash: integer("counted_cash"),
    countedYape: integer("counted_yape"),
    systemAmount: integer("system_amount"),
    difference: integer("difference"),
    totalCash: integer("total_cash").notNull().default(0),
    totalYape: integer("total_yape").notNull().default(0),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    status: shiftStatusEnum("status").notNull().default("OPEN"),
  },
  (t) => [
    uniqueIndex("cash_shifts_one_open_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'OPEN'`),
  ],
);
