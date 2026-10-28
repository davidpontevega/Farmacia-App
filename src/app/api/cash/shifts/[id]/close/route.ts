import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { uuidSchema } from "@/lib/schemas";
import { forceCloseSchema } from "@/modules/cash/schemas";
import { forceCloseShift } from "@/server/services/cash.service";

type Ctx = { params: Promise<{ id: string }> };

// Cierre de un turno por un supervisor (el de otra persona, o el propio).
export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requirePermission("cash.supervise");
  const input = forceCloseSchema.parse(await req.json());
  return NextResponse.json(await forceCloseShift(user.id, uuidSchema.parse((await params).id), input));
});
