import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api-handler";
import { requirePermission } from "@/lib/auth";
import { BusinessRuleError } from "@/lib/errors";
import { readPrescriptionPhoto } from "@/server/services/prescription-read.service";

const bodySchema = z.object({ file: z.instanceof(File, { message: "Falta la imagen" }) });

// La lectura puede tardar hasta ~55 s con el plan gratuito de Gemini (ver prescription-reader.ts).
export const maxDuration = 60;

export const POST = handle(async (req) => {
  const { user } = await requirePermission("sales.create");
  const form = await req.formData().catch(() => {
    throw new BusinessRuleError("Formulario inválido");
  });
  const { file } = bodySchema.parse({ file: form.get("file") });
  return NextResponse.json({ lines: await readPrescriptionPhoto(user.id, file) }, { headers: { "Cache-Control": "no-store" } });
});
