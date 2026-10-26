import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { updateProductSchema } from "@/modules/products/schemas";
import { uuidSchema } from "@/lib/schemas";
import { updateProduct } from "@/server/services/product.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { user } = await requirePermission("products.update");
  const id = uuidSchema.parse((await params).id);
  const input = updateProductSchema.parse(await req.json());
  await updateProduct(user.id, id, input);
  return NextResponse.json({ ok: true });
});
