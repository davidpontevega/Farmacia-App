import { z } from "zod";
import { isRealDate, todayLima } from "@/lib/dates";
import { EXPIRY_WINDOWS, rangeError, type ExpiryWindow } from "@/lib/reports";

const date = z.string().refine(isRealDate, "Fecha inválida");

export const salesReportQuerySchema = z
  .object({
    from: date,
    to: date,
    sort: z.enum(["units", "amount", "profit"]).default("units"),
  })
  .superRefine((q, ctx) => {
    const message = rangeError(q.from, q.to, todayLima());
    if (message) ctx.addIssue({ code: "custom", message, path: ["to"] });
  });

export const alertsQuerySchema = z.object({
  days: z.coerce
    .number()
    .refine((d): d is ExpiryWindow => (EXPIRY_WINDOWS as readonly number[]).includes(d), "Elige 30, 60 o 90 días")
    .default(30),
});
