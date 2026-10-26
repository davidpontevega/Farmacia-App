import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { openShiftSchema } from "@/modules/cash/schemas";
import { openShift } from "@/server/services/cash.service";

export const POST = handle(async (req) => {
  const { user } = await requirePermission("cash.open");
  const input = openShiftSchema.parse(await req.json());
  const shift = await openShift(user.id, input);
  return NextResponse.json({ id: shift.id }, { status: 201 });
});
