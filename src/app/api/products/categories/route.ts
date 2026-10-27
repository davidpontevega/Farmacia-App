import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import * as productRepo from "@/server/repositories/product.repository";

export const GET = handle(async () => {
  await requirePermission("products.read");
  return NextResponse.json(await productRepo.listCategories());
});
