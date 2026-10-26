import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { updateUserSchema, userIdSchema } from "@/modules/users/schemas";
import { updateUser } from "@/server/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { user } = await requirePermission("users.update");
  const id = userIdSchema.parse((await params).id);
  const input = updateUserSchema.parse(await req.json());
  await updateUser(user.id, id, input);
  return NextResponse.json({ ok: true });
});
