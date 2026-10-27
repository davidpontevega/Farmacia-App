import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  canViewProof,
  proofCutoff,
  proofFileError,
  proofUploadError,
  PROOF_TYPES,
  sniffProofType,
} from "@/lib/proof";
import * as saleRepo from "@/server/repositories/sale.repository";
import { deleteProof, getProof, isProofStorageEnabled, putProof } from "@/server/storage/proof-blob";

/** Guarda la foto de la transferencia. La venta se bloquea para que dos subidas no se pisen. */
export async function uploadProof(userId: string, saleId: string, file: File) {
  if (!isProofStorageEnabled()) throw new BusinessRuleError("El almacenamiento de constancias no está configurado");
  const fileError = proofFileError(file);
  if (fileError) throw new BusinessRuleError(fileError);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffProofType(bytes);
  if (!type) throw new BusinessRuleError("El archivo no es una imagen JPEG, PNG o WebP");

  return db.transaction(async (tx) => {
    const sale = await saleRepo.lockSale(saleId, tx);
    if (!sale) throw new NotFoundError("Venta no encontrada");
    const refusal = proofUploadError(sale, userId, new Date());
    if (refusal) {
      throw refusal.status === 403 ? new ForbiddenError(refusal.message) : new ConflictError(refusal.message);
    }

    // La subida (≤ 2 MB) ocurre con la venta bloqueada: es lo que evita dos subidas a la vez o anular en medio.
    const path = `proofs/${saleId}/${randomUUID()}.${PROOF_TYPES[type]}`;
    await putProof(path, bytes, type);
    try {
      if (!(await saleRepo.setProof(saleId, path, tx))) throw new ConflictError("La venta ya tiene constancia");
      await writeAudit(tx, { actorId: userId, action: "sale.proof_uploaded", entityType: "sale", entityId: saleId });
    } catch (err) {
      await deleteProof(path).catch(() => undefined); // no dejar una foto huérfana
      throw err;
    }
  });
}

export async function readProof(userId: string, permissions: readonly string[], saleId: string) {
  const sale = await saleRepo.findWithItems(saleId);
  if (!sale) throw new NotFoundError("Venta no encontrada");
  if (!canViewProof(sale, userId, permissions)) throw new ForbiddenError();
  const path = await saleRepo.proofPathOf(saleId);
  if (!path) throw new NotFoundError("La venta no tiene constancia");
  const proof = await getProof(path);
  if (!proof) throw new NotFoundError("La constancia ya no está disponible");
  return proof;
}

/** Borra las constancias de más de 90 días. La venta y sus montos no se tocan. */
export async function purgeExpiredProofs(now = new Date()) {
  const expired = await saleRepo.expiredProofs(proofCutoff(now));
  let purged = 0;
  let failed = 0;
  // Una constancia que falla no frena a las demás; la próxima corrida la reintenta (borrar el blob es idempotente).
  for (const { id, proofPath } of expired) {
    if (!proofPath) continue;
    try {
      await deleteProof(proofPath);
      await db.transaction(async (tx) => {
        await saleRepo.clearProof(id, tx);
        await writeAudit(tx, { actorId: null, action: "sale.proof_purged", entityType: "sale", entityId: id });
      });
      purged++;
    } catch (err) {
      failed++;
      console.error("No se pudo purgar la constancia", id, err);
    }
  }
  return { purged, failed };
}
