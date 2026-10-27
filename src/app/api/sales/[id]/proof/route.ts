import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api-handler";
import { requirePermission, requireUser } from "@/lib/auth";
import { BusinessRuleError } from "@/lib/errors";
import { uuidSchema } from "@/lib/schemas";
import { readProof, uploadProof } from "@/server/services/sale-proof.service";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ file: z.instanceof(File, { message: "Falta la foto" }) });

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requirePermission("sales.create");
  const saleId = uuidSchema.parse((await params).id);
  const { file } = bodySchema.parse({ file: (await req.formData().catch(() => { throw new BusinessRuleError("Formulario inválido"); })).get("file") });
  await uploadProof(user.id, saleId, file);
  return NextResponse.json({ ok: true }, { status: 201 });
});

// La imagen nunca se cachea: es un dato personal con permisos por venta.
export const GET = handle<Ctx>(async (_req, { params }) => {
  const { user, permissions } = await requireUser();
  const proof = await readProof(user.id, permissions, uuidSchema.parse((await params).id));
  return new Response(proof.stream, {
    headers: { "Content-Type": proof.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
});
