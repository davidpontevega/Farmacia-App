import { check, index, integer, pgSequence, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt, id, paymentMethodEnum, saleStatusEnum } from "./_shared";
import { cashShifts } from "./cash-shift";
import { users } from "./user";

// Número de ticket. No es transaccional: una venta que falla puede dejar un salto.
export const ticketSeq = pgSequence("ticket_seq", { startWith: 1 });

export const sales = pgTable(
  "sales",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => cashShifts.id),
    ticketNumber: text("ticket_number").notNull().unique(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    cashAmount: integer("cash_amount").notNull().default(0),
    yapeAmount: integer("yape_amount").notNull().default(0),
    status: saleStatusEnum("status").notNull().default("COMPLETED"),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "sales_payment_matches_total",
      sql`${t.cashAmount} + ${t.yapeAmount} = ${t.total}`,
    ),
    check(
      "sales_total_matches_subtotal",
      sql`${t.total} = ${t.subtotal} - ${t.discount}`,
    ),
    check("sales_amounts_nonneg", sql`${t.discount} >= 0 AND ${t.cashAmount} >= 0 AND ${t.yapeAmount} >= 0 AND ${t.total} >= 0`),
    index("sales_shift_idx").on(t.shiftId),
    index("sales_created_idx").on(sql`${t.createdAt} desc`),
  ],
);
