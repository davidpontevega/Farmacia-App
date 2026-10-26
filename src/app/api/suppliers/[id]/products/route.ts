import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { uuidSchema } from "@/lib/schemas";
import * as supplierRepo from "@/server/repositories/supplier.repository";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  await requirePermission("purchases.create");
  return NextResponse.json(await supplierRepo.linksOf(uuidSchema.parse((await params).id)));
});
