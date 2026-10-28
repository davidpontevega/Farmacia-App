import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { createShortagesSchema, resolveShortageSchema, shortagesQuerySchema } from "@/modules/shortages/schemas";
import { createShortages, listShortages, resolveShortage } from "@/server/services/shortage.service";

export const POST = handle(async (req) => {
  const { user, permissions } = await requirePermission("shortages.create");
  const input = createShortagesSchema.parse(await req.json());
  return NextResponse.json(await createShortages(user.id, permissions, input), { status: 201 });
});

export const GET = handle(async (req) => {
  await requirePermission("shortages.read");
  const query = shortagesQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await listShortages(query.status));
});

export const PATCH = handle(async (req) => {
  const { user } = await requirePermission("shortages.update");
  const input = resolveShortageSchema.parse(await req.json());
  return NextResponse.json(await resolveShortage(user.id, input));
});
