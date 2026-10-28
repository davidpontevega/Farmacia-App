import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { navCounters } from "@/server/services/home.service";

// Cualquier usuario autenticado: el servicio solo calcula y devuelve los contadores de lo que puede leer.
export const GET = handle(async () => {
  const { permissions } = await requireUser();
  return NextResponse.json(await navCounters(permissions), { headers: { "Cache-Control": "no-store" } });
});
