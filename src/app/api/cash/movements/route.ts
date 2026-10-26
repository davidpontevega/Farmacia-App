import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { ForbiddenError } from "@/lib/errors";
import type { PermissionCode } from "@/lib/permissions";
import { movementSchema } from "@/modules/cash/schemas";
import { addMovement } from "@/server/services/cash.service";

const PERMISSION_BY_TYPE: Record<string, PermissionCode> = {
  CASH_WITHDRAWAL: "cash.withdraw",
  YAPE_TO_CASH_EXCHANGE: "cash.exchange",
};

export const POST = handle(async (req) => {
  // El permiso depende del tipo, así que primero se autentica y luego se valida.
  const { user, permissions } = await requireUser();
  if (!Object.values(PERMISSION_BY_TYPE).some((p) => permissions.includes(p))) {
    throw new ForbiddenError();
  }
  const input = movementSchema.parse(await req.json());
  if (!permissions.includes(PERMISSION_BY_TYPE[input.type])) throw new ForbiddenError();

  const movement = await addMovement(user.id, input);
  return NextResponse.json({ id: movement.id }, { status: 201 });
});
