import { z } from "zod";
import { isRealDate, todayLima } from "@/lib/dates";
import { MAX_PURCHASE_TOTAL, purchaseTotal } from "@/lib/purchases";
import { createLotSchema } from "@/modules/inventory/schemas";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const newProductSchema = z.object({
  commercialName: z.string().trim().min(1, "Nombre requerido").max(150),
  genericName: optionalText(150),
  laboratory: optionalText(100),
  category: optionalText(100),
});

const blankToUndefined = (v: string | undefined) => (v ? v : undefined);

/** Entrada de la API: montos en centavos enteros, cantidades en unidades de stock. */
const purchaseItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    newProduct: newProductSchema.optional(),
    ...createLotSchema.shape,
    // El lote es opcional: vacío, el servidor asigna AAAAMM según el vencimiento.
    lotNumber: z.string().trim().max(50).optional().transform(blankToUndefined),
    salePrice: z.number().int().min(0).max(100_000_000).optional(),
    // Para aprender: el código del proveedor y cuántas unidades trae su presentación.
    supplierCode: z.string().trim().max(30).optional().transform(blankToUndefined),
    unitsPerPackage: z.number().int().min(1).max(100_000).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.productId === undefined) === (v.newProduct === undefined)) {
      ctx.addIssue({ code: "custom", message: "Elige un producto existente o uno nuevo", path: ["productId"] });
    }
    if (v.newProduct && !(v.salePrice && v.salePrice > 0)) {
      ctx.addIssue({ code: "custom", message: "El precio de venta es obligatorio para un producto nuevo", path: ["salePrice"] });
    }
  });

export const createPurchaseSchema = z
  .object({
    supplier: optionalText(150),
    documentNumber: optionalText(50),
    // Fecha del documento del proveedor; vacía = el día del registro.
    documentDate: z
      .string()
      .refine(isRealDate, "Fecha inválida")
      .refine((v) => v <= todayLima(), "La fecha del documento no puede ser futura")
      .optional(),
    otherCharges: z.number().int().min(0).max(MAX_PURCHASE_TOTAL).default(0),
    items: z.array(purchaseItemSchema).min(1, "Agrega al menos un ítem").max(200),
  })
  .refine((v) => purchaseTotal(v.items) + v.otherCharges <= MAX_PURCHASE_TOTAL, {
    message: "El total de la compra es demasiado grande",
    path: ["items"],
  });

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
