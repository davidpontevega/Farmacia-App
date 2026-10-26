import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requireUser } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { uuidSchema } from "@/lib/schemas";
import * as saleRepo from "@/server/repositories/sale.repository";

type Ctx = { params: Promise<{ id: string }> };

// Una venta la ve su autor o quien tiene reportes; los demás no.
export const GET = handle<Ctx>(async (_req, { params }) => {
  const { user, permissions } = await requireUser();
  const sale = await saleRepo.findWithItems(uuidSchema.parse((await params).id));
  if (!sale) throw new NotFoundError("Venta no encontrada");
  if (sale.userId !== user.id && !permissions.includes("reports.read")) {
    throw new ForbiddenError();
  }
  return NextResponse.json(sale);
});
