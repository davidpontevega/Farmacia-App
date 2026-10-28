import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { missesSince, missKey } from "@/lib/symptom-misses";
import * as missRepo from "@/server/repositories/symptom-miss.repository";

/** Guarda la consulta sin resultado si cumple las reglas (frase corta, solo letras). Devuelve si se guardó. */
export async function recordMiss(query: string) {
  const key = missKey(query);
  if (!key) return { saved: false };
  await missRepo.record(key);
  return { saved: true };
}

export async function listMisses() {
  const rows = await missRepo.listSince(missesSince(new Date()));
  return rows.map((r) => ({ ...r, lastAt: r.lastAt.toISOString() }));
}

export async function removeMiss(userId: string, id: string) {
  await db.transaction(async (tx) => {
    if (!(await missRepo.remove(id, tx))) throw new NotFoundError("Consulta no encontrada");
    // Sin el texto de la consulta: solo qué fila se quitó.
    await writeAudit(tx, { actorId: userId, action: "symptom_miss.removed", entityType: "symptom_miss", entityId: id });
  });
}

/** Las que no se repiten desde hace más de 90 días se borran (lo llama el cron diario). */
export const purgeOldMisses = (now = new Date()) => missRepo.purgeBefore(missesSince(now));
