// Constancia de pago (spec 014): reglas puras, sin Blob ni base de datos.
export const PROOF_MAX_BYTES = 2 * 1024 * 1024;
export const PROOF_UPLOAD_HOURS = 24;
export const PROOF_RETENTION_DAYS = 90;

export const PROOF_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ProofType = keyof typeof PROOF_TYPES;

export const isProofType = (t: string): t is ProofType => t in PROOF_TYPES;

/** Tipo real según los primeros bytes: el `Content-Type` que declara el cliente no basta. */
export function sniffProofType(b: Uint8Array): ProofType | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}

/** Mensaje de error del archivo, o null si sirve. */
export function proofFileError(file: { type: string; size: number }): string | null {
  if (!isProofType(file.type)) return "La foto debe ser JPEG, PNG o WebP";
  if (file.size === 0) return "La foto está vacía";
  if (file.size > PROOF_MAX_BYTES) return "La foto pesa más de 2 MB";
  return null;
}

type SaleForProof = { userId: string; status: string; yapeAmount: number; proofPath: string | null; createdAt: Date };

/** Quién puede subir: el autor, venta vigente con Yape, sin foto y dentro de 24 h. Devuelve el motivo si no. */
export function proofUploadError(sale: SaleForProof, userId: string, now: Date): { status: 403 | 409; message: string } | null {
  if (sale.userId !== userId) return { status: 403, message: "Solo quien hizo la venta puede subir la constancia" };
  if (sale.status !== "COMPLETED") return { status: 409, message: "La venta está anulada" };
  if (sale.yapeAmount <= 0) return { status: 409, message: "La venta no se pagó con Yape/Plin" };
  if (sale.proofPath) return { status: 409, message: "La venta ya tiene constancia" };
  if (now.getTime() - sale.createdAt.getTime() > PROOF_UPLOAD_HOURS * 3_600_000) {
    return { status: 409, message: "Pasaron más de 24 horas desde la venta" };
  }
  return null;
}

/** Autor o quien ve reportes (misma regla que el detalle de venta). */
export const canViewProof = (sale: { userId: string }, userId: string, permissions: readonly string[]) =>
  sale.userId === userId || permissions.includes("reports.read");

/** Las constancias subidas antes de este instante ya vencieron. */
export const proofCutoff = (now: Date) => new Date(now.getTime() - PROOF_RETENTION_DAYS * 86_400_000);
