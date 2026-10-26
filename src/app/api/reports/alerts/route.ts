import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { alertsQuerySchema } from "@/modules/reports/schemas";
import { alertsReport } from "@/server/services/report.service";

export const GET = handle(async (req) => {
  await requirePermission("reports.read");
  const { days } = alertsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await alertsReport(days));
});
