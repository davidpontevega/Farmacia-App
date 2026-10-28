import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { listMisses, recordMiss } from "@/server/services/consult.service";

// Tope amplio solo para rechazar basura: el servicio descarta lo que no cumple las reglas de guardado.
const bodySchema = z.object({ query: z.string().max(500) });

export const POST = handle(async (req) => {
  await requirePermission("products.read");
  const { query } = bodySchema.parse(await req.json());
  return NextResponse.json(await recordMiss(query));
});

export const GET = handle(async () => {
  await requirePermission("shortages.read");
  return NextResponse.json(await listMisses());
});
