import { NextResponse } from "next/server";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { lookupTicketSchema } from "@/modules/returns/schemas";
import { lookupByTicket } from "@/server/services/return.service";

export const GET = handle(async (req) => {
  await requirePermission("returns.create");
  const { ticket } = lookupTicketSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await lookupByTicket(ticket));
});
