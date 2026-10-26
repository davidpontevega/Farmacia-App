import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { uuidSchema } from "@/lib/schemas";
import { voidSale } from "@/server/services/sale.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (_req, { params }) => {
  const { user } = await requirePermission("sales.void");
  await voidSale(user.id, uuidSchema.parse((await params).id));
  return NextResponse.json({ ok: true });
});
