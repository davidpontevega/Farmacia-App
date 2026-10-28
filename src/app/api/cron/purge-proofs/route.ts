import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { UnauthorizedError } from "@/lib/errors";
import { purgeOldMisses } from "@/server/services/consult.service";
import { purgeExpiredProofs } from "@/server/services/sale-proof.service";

// Lo llama el cron de Vercel con `Authorization: Bearer $CRON_SECRET`. Sin secreto configurado, nadie entra.
export const GET = handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  const sent = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || sent.length !== expected.length || !timingSafeEqual(sent, expected)) throw new UnauthorizedError();
  // Las dos purgas corren siempre: si una falla, la otra igual se hace y el error se informa al final.
  const [proofs, misses] = await Promise.allSettled([purgeExpiredProofs(), purgeOldMisses()]);
  if (proofs.status === "rejected") {
    if (misses.status === "rejected") console.error("También falló la purga de consultas", misses.reason instanceof Error ? misses.reason.name : "error");
    throw proofs.reason;
  }
  if (misses.status === "rejected") throw misses.reason;
  return NextResponse.json({ ...proofs.value, missesPurged: misses.value });
});
