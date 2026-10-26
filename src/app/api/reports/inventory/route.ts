import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { inventoryReport } from "@/server/services/report.service";

export const GET = handle(async () => {
  await requirePermission("reports.read");
  return NextResponse.json(await inventoryReport());
});
