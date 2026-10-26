import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import * as supplierRepo from "@/server/repositories/supplier.repository";

const querySchema = z.object({ q: z.string().trim().max(100).default("") });

export const GET = handle(async (req) => {
  await requirePermission("purchases.create");
  const { q } = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await supplierRepo.search(q));
});
