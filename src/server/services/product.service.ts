import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { aliasesError } from "@/lib/aliases";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import type { CreateProductInput, UpdateProductInput } from "@/modules/products/schemas";
import * as productRepo from "@/server/repositories/product.repository";

export async function createProduct(actorId: string, input: CreateProductInput) {
  return db.transaction(async (tx) => {
    const row = await productRepo.insert({ ...input, createdBy: actorId }, tx);
    await writeAudit(tx, {
      actorId,
      action: "product.created",
      entityType: "product",
      entityId: row.id,
      changes: { salePrice: row.salePrice },
    });
    return row;
  });
}

export async function updateProduct(actorId: string, id: string, input: UpdateProductInput) {
  const current = await productRepo.findById(id);
  if (!current) throw new NotFoundError("Producto no encontrado");

  // Los alias deben ser distintos del nombre comercial: del nuevo si cambia, y de los alias que ya tiene si solo cambia el nombre.
  if (input.aliases || input.commercialName) {
    const error = aliasesError(input.aliases ?? current.aliases, input.commercialName ?? current.commercialName);
    if (error) throw new BusinessRuleError(error);
  }

  const same = (a: unknown, b: unknown) => (Array.isArray(a) ? JSON.stringify(a) === JSON.stringify(b) : a === b);
  const fields = (Object.keys(input) as (keyof UpdateProductInput)[]).filter(
    (k) => input[k] !== undefined && !same(input[k], current[k]),
  );
  if (fields.length === 0) return;

  await db.transaction(async (tx) => {
    await productRepo.update(id, input, tx);
    await writeAudit(tx, {
      actorId,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      changes: {
        fields,
        ...(fields.includes("salePrice")
          ? { salePrice: { from: current.salePrice, to: input.salePrice } }
          : {}),
      },
    });
  });
}
