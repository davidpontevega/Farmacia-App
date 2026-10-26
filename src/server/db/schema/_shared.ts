import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const severityEnum = pgEnum("severity", ["info", "warning", "error"]);
export const movementTypeEnum = pgEnum("movement_type", [
  "ENTRY",
  "EXIT",
  "RETURN",
  "ADJUSTMENT",
]);
export const shiftStatusEnum = pgEnum("shift_status", ["OPEN", "CLOSED"]);
export const cashMovementTypeEnum = pgEnum("cash_movement_type", [
  "CASH_WITHDRAWAL",
  "YAPE_TO_CASH_EXCHANGE",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "YAPE",
  "MIXED",
]);
export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "VOIDED"]);
export const productConditionEnum = pgEnum("product_condition", [
  "GOOD",
  "DAMAGED",
  "EXPIRED",
]);
