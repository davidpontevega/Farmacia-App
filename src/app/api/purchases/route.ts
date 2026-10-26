import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { todayLima } from "@/lib/dates";
import { ForbiddenError } from "@/lib/errors";
import { createPurchaseSchema } from "@/modules/purchases/schemas";
import { salesRangeSchema } from "@/modules/sales/schemas";
import * as purchaseRepo from "@/server/repositories/purchase.repository";
import { createPurchase } from "@/server/services/purchase.service";

export const POST = handle(async (req) => {
  const { user, permissions } = await requirePermission("purchases.create");
  const input = createPurchaseSchema.parse(await req.json());

  // Crear productos o cambiar precios desde una compra exige también esos permisos.
  if (input.items.some((i) => i.newProduct) && !permissions.includes("products.create")) {
    throw new ForbiddenError();
  }
  if (input.items.some((i) => i.productId && i.salePrice) && !permissions.includes("products.update")) {
    throw new ForbiddenError();
  }

  return NextResponse.json(await createPurchase(user.id, input), { status: 201 });
});

// Historial por rango de fechas (hoy por defecto).
export const GET = handle(async (req) => {
  await requirePermission("purchases.read");
  const query = salesRangeSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const today = todayLima();
  return NextResponse.json(
    await purchaseRepo.listByRange({
      from: query.from ?? query.to ?? today,
      to: query.to ?? query.from ?? today,
    }),
  );
});
