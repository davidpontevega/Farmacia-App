import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { homeSummary } from "@/server/services/home.service";

export const GET = handle(async () => {
  const { permissions } = await requirePermission("reports.read");
  return NextResponse.json(await homeSummary(permissions), { headers: { "Cache-Control": "no-store" } });
});
