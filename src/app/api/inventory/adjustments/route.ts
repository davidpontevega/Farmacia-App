import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { adjustmentSchema } from "@/modules/inventory/schemas";
import { adjustStock } from "@/server/services/inventory.service";

export const POST = handle(async (req) => {
  const { user } = await requirePermission("inventory.adjust");
  const input = adjustmentSchema.parse(await req.json());
  return NextResponse.json(await adjustStock(user.id, input));
});
