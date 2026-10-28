import { z } from "zod";
import { isValidSoles, toCents } from "@/lib/money";

const MAX_CENTS = 100_000_000;
const cents = z.number().int().min(0).max(MAX_CENTS);

/** Entrada de la API: montos en centavos enteros. */
export const openShiftSchema = z.object({ openingAmount: cents });

export const closeShiftSchema = z.object({
  countedCash: cents,
  countedYape: cents,
});

/** Cierre por un supervisor: con el conteo que él hace, o «sin cuadre» cuando nadie puede contar. */
export const forceCloseSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("COUNTED"), countedCash: cents, countedYape: cents }),
  z.object({ mode: z.literal("NO_COUNT") }),
]);

export const movementSchema = z.object({
  type: z.enum(["CASH_WITHDRAWAL", "YAPE_TO_CASH_EXCHANGE"]),
  amount: z.number().int().min(1).max(MAX_CENTS),
  reason: z.string().trim().min(3, "Indica el motivo").max(200),
});

/** Formularios: todo texto; los montos en soles se convierten al enviar. */
const soles = (label: string) =>
  z.string().trim().refine(isValidSoles, `${label} inválido (ej. 10.50)`);

export const openShiftFormSchema = z.object({ openingAmount: soles("Monto") });

export const closeShiftFormSchema = z.object({
  countedCash: soles("Efectivo"),
  countedYape: soles("Yape"),
});

export const movementFormSchema = z.object({
  amount: soles("Monto").refine((v) => !isValidSoles(v) || toCents(v) > 0, "Debe ser mayor que 0"),
  reason: z.string().trim().min(3, "Indica el motivo").max(200),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type ForceCloseInput = z.infer<typeof forceCloseSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type OpenShiftFormValues = z.infer<typeof openShiftFormSchema>;
export type CloseShiftFormValues = z.infer<typeof closeShiftFormSchema>;
export type MovementFormValues = z.infer<typeof movementFormSchema>;
