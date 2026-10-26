import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { todayLima } from "@/lib/dates";
import { createSaleSchema, salesRangeSchema } from "@/modules/sales/schemas";
import * as saleRepo from "@/server/repositories/sale.repository";
import { createSale } from "@/server/services/sale.service";

export const POST = handle(async (req) => {
  const { user } = await requirePermission("sales.create");
  const input = createSaleSchema.parse(await req.json());
  return NextResponse.json(await createSale(user.id, input), { status: 201 });
});

// Ventas de todos los cajeros por rango de fechas (hoy por defecto): solo quien ve reportes.
export const GET = handle(async (req) => {
  await requirePermission("reports.read");
  const query = salesRangeSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const today = todayLima();
  return NextResponse.json(
    await saleRepo.listByRange({ from: query.from ?? query.to ?? today, to: query.to ?? query.from ?? today }),
  );
});
