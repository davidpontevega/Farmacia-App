import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { createLotSchema } from "@/modules/inventory/schemas";
import { uuidSchema } from "@/lib/schemas";
import * as inventoryRepo from "@/server/repositories/inventory.repository";
import { createLot } from "@/server/services/inventory.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  await requirePermission("lots.read");
  const id = uuidSchema.parse((await params).id);
  return NextResponse.json(await inventoryRepo.lotsForProduct(id));
});

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requirePermission("lots.create");
  const id = uuidSchema.parse((await params).id);
  const input = createLotSchema.parse(await req.json());
  const lot = await createLot(user.id, id, input);
  return NextResponse.json({ id: lot.id }, { status: 201 });
});
