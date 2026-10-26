import { z } from "zod";
import { isRealDate } from "@/lib/dates";

const cents = z.number().int().min(0).max(100_000_000);

/** Entrada de la API: montos en centavos enteros. */
export const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10_000),
      }),
    )
    .min(1, "El carrito está vacío")
    .max(100),
  paymentMethod: z.enum(["CASH", "YAPE", "MIXED"]),
  cashTendered: cents.optional(),
  yapeAmount: cents.optional(),
  // Total que el cajero vio en pantalla; si el servidor calcula otro, no se vende.
  expectedTotal: cents,
});

export const salesRangeSchema = z
  .object({
    from: z.string().refine(isRealDate, "Fecha inválida").optional(),
    to: z.string().refine(isRealDate, "Fecha inválida").optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "«Desde» no puede ser posterior a «Hasta»",
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SalesRange = z.infer<typeof salesRangeSchema>;
