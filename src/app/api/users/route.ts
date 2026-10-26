import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import type { UsersResponse } from "@/modules/users/types";
import * as userRepo from "@/server/repositories/user.repository";

export const GET = handle(async () => {
  await requirePermission("users.read");
  const [rows, roles] = await Promise.all([
    userRepo.listWithRoles(),
    userRepo.listRoles(),
  ]);
  const body: UsersResponse = {
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      pending: userRepo.isPendingClerkId(u.clerkId),
      roles: u.roles,
    })),
    roles,
  };
  return NextResponse.json(body);
});
