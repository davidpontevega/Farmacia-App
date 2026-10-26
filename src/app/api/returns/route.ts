import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { todayLima } from "@/lib/dates";
import { createReturnSchema } from "@/modules/returns/schemas";
import { salesRangeSchema } from "@/modules/sales/schemas";
import * as returnRepo from "@/server/repositories/return.repository";
import { createReturn } from "@/server/services/return.service";

export const POST = handle(async (req) => {
  const { user } = await requirePermission("returns.create");
  const input = createReturnSchema.parse(await req.json());
  return NextResponse.json(await createReturn(user.id, input), { status: 201 });
});

// Devoluciones de todos los cajeros por rango de fechas (hoy por defecto).
export const GET = handle(async (req) => {
  await requirePermission("returns.read");
  const query = salesRangeSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const today = todayLima();
  return NextResponse.json(
    await returnRepo.listByRange({
      from: query.from ?? query.to ?? today,
      to: query.to ?? query.from ?? today,
    }),
  );
});
