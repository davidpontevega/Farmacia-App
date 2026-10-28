import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { getLocalOpenShift } from "@/server/services/cash.service";

// El turno abierto de todo el local (hay una sola caja): quién la tiene y desde cuándo.
export const GET = handle(async () => {
  const { user, permissions } = await requirePermission("cash.read");
  return NextResponse.json(await getLocalOpenShift(user.id, permissions.includes("cash.supervise")));
});
