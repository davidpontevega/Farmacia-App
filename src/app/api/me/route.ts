import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";

export const GET = handle(async () => {
  const { user, permissions } = await requireUser();
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    permissions,
  });
});
