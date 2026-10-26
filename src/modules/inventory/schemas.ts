import { z } from "zod";
import { isRealDate, todayLima } from "@/lib/dates";
import { isValidSoles } from "@/lib/money";

const futureDate = z
  .string()
  .refine(isRealDate, "Fecha inválida")
  .refine((v) => v > todayLima(), "El vencimiento debe ser futuro");

/** Entrada de la API: costo en centavos enteros. */
export const createLotSchema = z.object({
  lotNumber: z.string().trim().min(1, "Número de lote requerido").max(50),
  expiryDate: futureDate,
  purchasePrice: z.number().int().min(0).max(100_000_000),
  quantity: z.number().int().min(1).max(1_000_000),
});

export const adjustmentSchema = z.object({
  lotId: z.string().uuid(),
  quantity: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((v) => v !== 0, "La cantidad no puede ser 0"),
  reason: z.string().trim().min(3, "Indica el motivo").max(200),
});

export const kardexQuerySchema = z
  .object({
    productId: z.string().uuid().optional(),
    from: z.string().refine(isRealDate, "Fecha inválida").optional(),
    to: z.string().refine(isRealDate, "Fecha inválida").optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "«Desde» no puede ser posterior a «Hasta»",
  });

/** Formularios: todo texto; el costo en soles se convierte al enviar. */
export const lotFormSchema = z.object({
  lotNumber: z.string().trim().min(1, "Número de lote requerido").max(50),
  expiryDate: futureDate,
  purchasePrice: z.string().trim().refine(isValidSoles, "Costo inválido (ej. 1.50)"),
  quantity: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Entero mayor que 0"),
});

export const adjustFormSchema = z.object({
  quantity: z
    .string()
    .trim()
    .regex(/^-?[1-9]\d*$/, "Entero distinto de 0 (ej. -5 o 10)"),
  reason: z.string().trim().min(3, "Indica el motivo").max(200),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type KardexQuery = z.infer<typeof kardexQuerySchema>;
export type LotFormValues = z.infer<typeof lotFormSchema>;
export type AdjustFormValues = z.infer<typeof adjustFormSchema>;
