import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { closeShiftSchema } from "@/modules/cash/schemas";
import { closeShift } from "@/server/services/cash.service";

export const POST = handle(async (req) => {
  const { user } = await requirePermission("cash.close");
  const input = closeShiftSchema.parse(await req.json());
  return NextResponse.json(await closeShift(user.id, input));
});
