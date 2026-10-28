import {
  check,
  integer,
  pgTable,
  text,
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
    /** Quién lo cerró (el dueño o un supervisor) y cómo: con su conteo, con conteo del supervisor o «sin cuadre» (spec 022). */
    closedBy: uuid("closed_by").references(() => users.id),
    closeMode: text("close_mode").notNull().default("NORMAL"),
    status: shiftStatusEnum("status").notNull().default("OPEN"),
  },
  (t) => [
    uniqueIndex("cash_shifts_one_open_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'OPEN'`),
    // Una sola caja física: un solo turno abierto en todo el local (spec 022).
    uniqueIndex("cash_shifts_one_open")
      .on(sql`(1)`)
      .where(sql`${t.status} = 'OPEN'`),
    check("cash_shifts_close_mode", sql`${t.closeMode} in ('NORMAL', 'FORCED_COUNTED', 'FORCED_NO_COUNT')`),
  ],
);
