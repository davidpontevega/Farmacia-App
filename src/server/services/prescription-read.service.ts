import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { AppError, BusinessRuleError } from "@/lib/errors";
import { READ_LIMIT, READ_MAX_BYTES, readLimitReached, readWindowStart } from "@/lib/prescription-read";
import { sniffProofType } from "@/lib/proof";
import { isPrescriptionReaderEnabled, readerUnavailable, readPrescription } from "@/server/ai/prescription-reader";
import * as auditRepo from "@/server/repositories/audit.repository";

const ACTION = "prescription.read";

/**
 * Valida que sea un JPEG, aplica el límite por usuario y lo lee. No guarda la imagen ni el texto.
 * Límite conocido: que la imagen sea un recorte solo se exige en el navegador; el servidor no puede verificarlo.
 */
export async function readPrescriptionPhoto(userId: string, file: File) {
  if (!isPrescriptionReaderEnabled()) throw readerUnavailable();
  if (file.size === 0 || file.size > READ_MAX_BYTES) throw new BusinessRuleError("La imagen debe pesar menos de 1 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniffProofType(bytes) !== "image/jpeg") throw new BusinessRuleError("La imagen debe ser JPEG");

  // El cupo se reserva antes de llamar a Google: con el candado, peticiones simultáneas no pasan todas el conteo.
  await db.transaction(async (tx) => {
    await auditRepo.lockActor(userId, tx);
    const recent = await auditRepo.countByActor(userId, ACTION, readWindowStart(new Date()), tx);
    if (readLimitReached(recent)) throw new AppError(429, `Máximo ${READ_LIMIT} lecturas cada 10 minutos; espera un momento o escribe las líneas a mano`);
    await writeAudit(tx, { actorId: userId, action: ACTION, entityType: "prescription" });
  });

  let lines: string[] | null = null;
  try {
    lines = await readPrescription(bytes);
    return lines;
  } finally {
    // Solo la cantidad de líneas: nunca el contenido. Si falla, no tapa el resultado ni el error original.
    await writeAudit(db, { actorId: userId, action: `${ACTION}_result`, entityType: "prescription", metadata: { lines: lines?.length ?? 0, ok: lines !== null } }).catch(
      (err: unknown) => console.error("No se pudo registrar el resultado de la lectura", err instanceof Error ? err.name : "error"),
    );
  }
}
