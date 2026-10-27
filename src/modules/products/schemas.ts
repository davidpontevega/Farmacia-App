import { z } from "zod";
import { isLocationPart, MAX_LOCATION_PART } from "@/lib/location";
import { isValidSoles } from "@/lib/money";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const locationPart = z
  .string()
  .trim()
  .max(MAX_LOCATION_PART)
  .refine(isLocationPart, "Ubicación inválida")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

/** Entrada de la API: el precio va en centavos enteros. */
export const createProductSchema = z.object({
  commercialName: z.string().trim().min(1, "Nombre requerido").max(150),
  genericName: optionalText(150),
  laboratory: optionalText(100),
  category: optionalText(100),
  shelf: locationPart,
  shelfRow: locationPart,
  salePrice: z.number().int().min(0).max(100_000_000),
  minStock: z.number().int().min(0).max(1_000_000),
});

export const updateProductSchema = createProductSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Nada que actualizar",
  });

export const listProductsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  /** Principios activos o nombres separados por coma (consulta por síntoma): hasta 30, de hasta 60 caracteres. */
  names: z
    .string()
    .max(30 * 61)
    .optional()
    .transform((v) => (v ? v.split(",").map((n) => n.trim()).filter(Boolean) : undefined))
    .pipe(z.array(z.string().max(60)).max(30).optional()),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  includeInactive: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

/** Formulario: todo texto; el precio en soles se convierte al enviar. */
export const productFormSchema = z.object({
  commercialName: z.string().trim().min(1, "Nombre requerido").max(150),
  genericName: z.string().trim().max(150),
  laboratory: z.string().trim().max(100),
  category: z.string().trim().max(100),
  shelf: z.string().trim().max(MAX_LOCATION_PART, "Máximo 20 caracteres").refine(isLocationPart, "Ubicación inválida"),
  shelfRow: z.string().trim().max(MAX_LOCATION_PART, "Máximo 20 caracteres").refine(isLocationPart, "Ubicación inválida"),
  salePrice: z.string().trim().refine(isValidSoles, "Precio inválido (ej. 2.50)"),
  minStock: z.string().trim().regex(/^\d+$/, "Número entero"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;
