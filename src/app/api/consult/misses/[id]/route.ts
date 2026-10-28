import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { uuidSchema } from "@/lib/schemas";
import { removeMiss } from "@/server/services/consult.service";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handle<Ctx>(async (_req, { params }) => {
  const { user } = await requirePermission("products.update");
  await removeMiss(user.id, uuidSchema.parse((await params).id));
  return NextResponse.json({ ok: true });
});
