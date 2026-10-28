import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { uuidSchema } from "@/lib/schemas";
import * as purchaseRepo from "@/server/repositories/purchase.repository";

type Ctx = { params: Promise<{ id: string }> };

// Detalle de una compra: ítems por lote y faltantes que cubrió (spec 024).
export const GET = handle<Ctx>(async (_req, { params }) => {
  await requirePermission("purchases.read");
  const purchase = await purchaseRepo.findWithItems(uuidSchema.parse((await params).id));
  if (!purchase) throw new NotFoundError("Compra no encontrada");
  return NextResponse.json(purchase);
});
