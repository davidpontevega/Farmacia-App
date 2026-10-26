import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { getActiveShift } from "@/server/services/cash.service";

// Sin id en la ruta: cada usuario solo ve su propio turno.
export const GET = handle(async () => {
  const { user } = await requirePermission("cash.read");
  return NextResponse.json(await getActiveShift(user.id));
});
