import { AppError } from "@/lib/errors";
import { parseReadLines } from "@/lib/prescription-read";

// Único punto que habla con Gemini: para cambiar de proveedor o de plan se toca solo este archivo y la clave.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 30_000;

export const isPrescriptionReaderEnabled = () => !!process.env.GEMINI_API_KEY;

const PROMPT = [
  "La imagen es un recorte de una receta médica manuscrita o impresa con la lista de medicamentos.",
  "Transcribe SOLO los medicamentos, uno por línea, con concentración y cantidad si aparecen (ejemplo: «Amoxicilina 500 mg x 21»).",
  "Ignora nombres de personas, edades, diagnósticos, firmas, sellos y cualquier otro texto que no sea un medicamento.",
  "No adivines: si una palabra o número no se lee con claridad, escribe lo que se alcance a leer y añade «?» en esa parte.",
  'Responde únicamente con JSON: {"lines": ["..."]}. Si no hay medicamentos legibles, {"lines": []}.',
].join("\n");

const UNAVAILABLE = "El lector de recetas no está disponible ahora; escribe las líneas a mano";
export const readerUnavailable = (status = 503) => new AppError(status, UNAVAILABLE);

/** Lee un recorte JPEG y devuelve las líneas de medicamentos. No guarda ni registra el contenido. */
export async function readPrescription(jpeg: Uint8Array): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw readerUnavailable();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: "image/jpeg", data: Buffer.from(jpeg).toString("base64") } }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: { type: "OBJECT", properties: { lines: { type: "ARRAY", items: { type: "STRING" } } }, required: ["lines"] },
        },
      }),
    });
  } catch (err) {
    // Sin red o tiempo agotado. Solo el tipo de error: el mensaje podría traer parte de la petición.
    console.error("No se pudo llamar a Gemini", err instanceof Error ? err.name : "error");
    throw readerUnavailable();
  }

  // Solo el código de estado: el cuerpo puede repetir el contenido enviado.
  if (!res.ok) {
    console.error("Gemini respondió", res.status);
    throw readerUnavailable(res.status === 429 ? 429 : 503); // 429: se agotó el cupo gratuito
  }

  let body: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    body = await res.json();
  } catch {
    throw new AppError(502, "No se entendió la lectura de la receta; intenta con otro recorte");
  }
  const lines = parseReadLines(body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "");
  if (!lines) throw new AppError(502, "No se entendió la lectura de la receta; intenta con otro recorte");
  return lines;
}
