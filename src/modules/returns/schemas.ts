import { z } from "zod";

export const lookupTicketSchema = z.object({
  ticket: z.string().trim().min(3, "Escribe al menos 3 caracteres del ticket").max(30),
});

/** El cliente solo indica línea, cantidad y estado: precio y lote salen de la venta. */
export const createReturnSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().trim().min(3, "Indica el motivo").max(200),
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10_000),
        condition: z.enum(["GOOD", "DAMAGED"]),
      }),
    )
    .min(1, "Elige al menos un producto")
    .max(100),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
