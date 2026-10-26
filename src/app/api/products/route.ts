import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { todayLima } from "@/lib/dates";
import { getStockStatus } from "@/lib/stock";
import { createProductSchema, listProductsQuerySchema } from "@/modules/products/schemas";
import { PAGE_SIZE, type ProductsResponse } from "@/modules/products/types";
import * as productRepo from "@/server/repositories/product.repository";
import { createProduct } from "@/server/services/product.service";

export const GET = handle(async (req) => {
  await requirePermission("products.read");
  const query = listProductsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const { items, total } = await productRepo.list({ ...query, pageSize: PAGE_SIZE });

  const today = todayLima();
  const body: ProductsResponse = {
    total,
    items: items.map((p) => ({
      id: p.id,
      commercialName: p.commercialName,
      genericName: p.genericName,
      laboratory: p.laboratory,
      category: p.category,
      salePrice: p.salePrice,
      minStock: p.minStock,
      isActive: p.isActive,
      stock: p.stock,
      nextExpiry: p.nextExpiry,
      status: getStockStatus({
        stock: p.stock,
        minStock: p.minStock,
        nextExpiry: p.nextExpiry,
        today,
      }),
    })),
  };
  return NextResponse.json(body);
});

export const POST = handle(async (req) => {
  const { user } = await requirePermission("products.create");
  const input = createProductSchema.parse(await req.json());
  const created = await createProduct(user.id, input);
  return NextResponse.json({ id: created.id }, { status: 201 });
});
