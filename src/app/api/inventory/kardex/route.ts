import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { kardexQuerySchema } from "@/modules/inventory/schemas";
import * as inventoryRepo from "@/server/repositories/inventory.repository";

export const GET = handle(async (req) => {
  await requirePermission("inventory.kardex");
  const query = kardexQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return NextResponse.json(await inventoryRepo.kardex(query));
});
