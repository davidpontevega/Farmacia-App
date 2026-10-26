import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import {
  deactivateFromClerk,
  syncFromClerk,
} from "@/server/services/user.service";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const u = evt.data;
      const primary = u.email_addresses.find(
        (e) => e.id === u.primary_email_address_id,
      );
      // Un email sin verificar nunca adopta una fila ni se copia a la BD.
      if (primary && primary.verification?.status === "verified") {
        const email = primary.email_address;
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || email;
        await syncFromClerk({ clerkId: u.id, email, name });
      }
    } else if (evt.type === "user.deleted" && evt.data.id) {
      await deactivateFromClerk(evt.data.id);
    }
  } catch (err) {
    // 500 hace que Clerk reintente; el handler es idempotente.
    console.error(err);
    return NextResponse.json({ error: "Error procesando evento" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
