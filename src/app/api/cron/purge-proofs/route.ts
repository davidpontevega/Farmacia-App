import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { UnauthorizedError } from "@/lib/errors";
import { purgeExpiredProofs } from "@/server/services/sale-proof.service";

// Lo llama el cron de Vercel con `Authorization: Bearer $CRON_SECRET`. Sin secreto configurado, nadie entra.
export const GET = handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  const sent = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || sent.length !== expected.length || !timingSafeEqual(sent, expected)) throw new UnauthorizedError();
  return NextResponse.json(await purgeExpiredProofs());
});
