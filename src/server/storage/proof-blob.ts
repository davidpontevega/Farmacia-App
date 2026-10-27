import { del, get, put } from "@vercel/blob";
import type { ProofType } from "@/lib/proof";

// Vercel Blob en modo privado: sin URL pública, solo se lee a través de la API con permisos.
export const isProofStorageEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function putProof(path: string, bytes: Uint8Array, contentType: ProofType) {
  await put(path, Buffer.from(bytes), { access: "private", contentType, addRandomSuffix: false });
}

export async function getProof(path: string) {
  const result = await get(path, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType };
}

export const deleteProof = (path: string) => del(path);
