import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { userIdSchema } from "@/modules/users/schemas";
import { deactivateUser } from "@/server/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (_req, { params }) => {
  const { user } = await requirePermission("users.deactivate");
  await deactivateUser(user.id, userIdSchema.parse((await params).id));
  return NextResponse.json({ ok: true });
});
