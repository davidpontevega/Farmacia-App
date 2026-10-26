import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { salesReportQuerySchema } from "@/modules/reports/schemas";
import { salesReport } from "@/server/services/report.service";

export const GET = handle(async (req) => {
  await requirePermission("reports.read");
  const q = salesReportQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await salesReport({ from: q.from, to: q.to }, q.sort));
});
