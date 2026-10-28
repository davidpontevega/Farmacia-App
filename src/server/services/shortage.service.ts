import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { canAddSource, dedupeSince, shortageKey, type ShortageStatus } from "@/lib/shortages";
import type { CreateShortagesInput, ResolveShortageInput } from "@/modules/shortages/schemas";
import * as auditRepo from "@/server/repositories/audit.repository";
import * as productRepo from "@/server/repositories/product.repository";
import * as shortageRepo from "@/server/repositories/shortage.repository";

export async function createShortages(userId: string, permissions: readonly string[], input: CreateShortagesInput) {
  if (input.items.some((i) => !canAddSource(i.source, permissions))) {
    throw new ForbiddenError("Sin permiso para anotar faltantes a mano");
  }

  return db.transaction(async (tx) => {
    // Pone en fila los envíos simultáneos del mismo usuario: así la deduplicación ve lo que el otro acaba de insertar.
    await auditRepo.lockActor(userId, tx);
    const ids = [...new Set(input.items.flatMap((i) => i.productId ?? []))];
    if (ids.length > 0 && (await productRepo.findActiveByIds(ids, tx)).length !== ids.length) {
      throw new BusinessRuleError("Un producto indicado no existe o está inactivo");
    }
    const rows = input.items.map((i) => ({
      name: i.name,
      nameKey: shortageKey(i.name),
      quantity: i.quantity,
      source: i.source,
      productId: i.productId ?? null,
    }));
    const created = await shortageRepo.insertNew(userId, rows, dedupeSince(new Date()), tx);
    // Solo cantidades: los nombres no van a la auditoría.
    await writeAudit(tx, { actorId: userId, action: "shortage.created", entityType: "shortage", changes: { received: rows.length, created } });
    return { created, skipped: rows.length - created };
  });
}

export const listShortages = (status: ShortageStatus) => shortageRepo.listGrouped(status);

export async function resolveShortage(userId: string, input: ResolveShortageInput) {
  const nameKey = shortageKey(input.nameKey);
  return db.transaction(async (tx) => {
    const affected = await shortageRepo.resolveOpenByKey(nameKey, input.status, userId, tx);
    if (affected === 0) throw new NotFoundError("No hay pedidos abiertos de ese medicamento");
    await writeAudit(tx, {
      actorId: userId,
      action: "shortage.status_changed",
      entityType: "shortage",
      entityId: nameKey,
      changes: { status: input.status, rows: affected },
    });
    return { affected };
  });
}
