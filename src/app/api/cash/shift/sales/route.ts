import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import * as cashRepo from "@/server/repositories/cash.repository";
import * as saleRepo from "@/server/repositories/sale.repository";

// Sin id en la ruta: solo las ventas del turno abierto del propio usuario.
export const GET = handle(async () => {
  const { user } = await requirePermission("cash.read");
  const shift = await cashRepo.findOpenShift(user.id);
  return NextResponse.json(shift ? await saleRepo.listByShift(shift.id) : []);
});
