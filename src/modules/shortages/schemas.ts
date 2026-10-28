import { z } from "zod";
import { SHORTAGE_BATCH_MAX, SHORTAGE_NAME_MAX, shortageKey } from "@/lib/shortages";

// Sin caracteres de control: el nombre viene de texto libre o de una IA y acaba en pantallas y archivos CSV.
const NO_CONTROL = /^[^\u0000-\u001f\u007f]*$/;

const name = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Falta el nombre").max(SHORTAGE_NAME_MAX).regex(NO_CONTROL, "Caracteres no válidos").refine((s) => shortageKey(s).length > 0, "Nombre no válido"));

export const shortageItemSchema = z.object({
  name,
  quantity: z.number().int().min(1).max(9999),
  source: z.enum(["PRESCRIPTION", "MANUAL"]),
  productId: z.string().uuid().optional(),
});

export const createShortagesSchema = z.object({
  items: z.array(shortageItemSchema).min(1).max(SHORTAGE_BATCH_MAX),
});

export const shortagesQuerySchema = z.object({
  status: z.enum(["OPEN", "ORDERED", "DISMISSED"]).default("OPEN"),
});

export const resolveShortageSchema = z.object({
  nameKey: z.string().trim().min(1).max(SHORTAGE_NAME_MAX),
  status: z.enum(["ORDERED", "DISMISSED"]),
});

export type CreateShortagesInput = z.infer<typeof createShortagesSchema>;
export type ShortageItemInput = z.infer<typeof shortageItemSchema>;
export type ResolveShortageInput = z.infer<typeof resolveShortageSchema>;
