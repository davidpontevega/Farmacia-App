import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { inviteUserSchema } from "@/modules/users/schemas";
import { inviteUser } from "@/server/services/user.service";

export const POST = handle(async (req) => {
  const { user } = await requirePermission("users.create");
  const input = inviteUserSchema.parse(await req.json());
  const created = await inviteUser(user.id, input);
  return NextResponse.json({ id: created.id }, { status: 201 });
});
