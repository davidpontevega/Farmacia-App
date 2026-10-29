import { AppError } from "@/lib/errors";
import { parseReadLines } from "@/lib/prescription-read";

// Único punto que habla con Gemini: para cambiar de proveedor o de plan se toca solo este archivo y la clave.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// Plan gratuito: la misma lectura tarda de 4 a más de 30 s según la carga de Google, y un modelo puede responder «alta demanda».
// Por eso se consultan varios modelos a la vez y gana el primero que devuelve una lectura válida; los demás se cancelan.
const FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];
const TIMEOUT_MS = 55_000;

export const isPrescriptionReaderEnabled = () => !!process.env.GEMINI_API_KEY;

const PROMPT = [
  "La imagen es un recorte de una receta médica manuscrita o impresa con la lista de medicamentos.",
  "Transcribe SOLO los medicamentos, uno por línea, con concentración y cantidad si aparecen (ejemplo: «Amoxicilina 500 mg x 21»).",
  "Ignora nombres de personas, edades, diagnósticos, firmas, sellos y cualquier otro texto que no sea un medicamento.",
  "No adivines: si una palabra o número no se lee con claridad, escribe lo que se alcance a leer y añade «?» en esa parte.",
  'Responde únicamente con JSON: {"lines": ["..."]}. Si no hay medicamentos legibles, {"lines": []}.',
].join("\n");

const UNAVAILABLE = "El lector de recetas no está disponible ahora; escribe las líneas a mano";
const BUSY = "El lector de recetas está muy ocupado ahora; intenta de nuevo en un minuto o escribe las líneas a mano";
const UNREADABLE = "No se entendió la lectura de la receta; intenta con otro recorte";
export const readerUnavailable = (status = 503) => new AppError(status, status === 429 ? BUSY : UNAVAILABLE);

/** Una lectura con un modelo. Falla con 429 (cupo), 503 (sin red, tiempo agotado o error de Google) o 502 (respuesta ilegible). */
async function readWithModel(model: string, key: string, data: string, signal: AbortSignal): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: "image/jpeg", data } }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: { type: "OBJECT", properties: { lines: { type: "ARRAY", items: { type: "STRING" } } }, required: ["lines"] },
        },
      }),
    });
  } catch (err) {
    // Sin red, tiempo agotado o cancelado por otro modelo (AbortError, no se registra). Solo el tipo de error: el mensaje podría traer parte de la petición.
    const name = err instanceof Error ? err.name : "error";
    if (name !== "AbortError") console.error("No se pudo llamar a Gemini", model, name);
    throw readerUnavailable();
  }

  // Solo el código de estado: el cuerpo puede repetir el contenido enviado.
  if (!res.ok) {
    console.error("Gemini respondió", model, res.status);
    throw readerUnavailable(res.status === 429 ? 429 : 503); // 429: se agotó el cupo gratuito
  }

  let body: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    body = await res.json();
  } catch {
    throw new AppError(502, UNREADABLE);
  }
  const lines = parseReadLines(body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "");
  if (!lines) throw new AppError(502, UNREADABLE);
  return lines;
}

/** Lee un recorte JPEG y devuelve las líneas de medicamentos. No guarda ni registra el contenido. */
export async function readPrescription(jpeg: Uint8Array): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw readerUnavailable();
  const models = [...new Set([process.env.GEMINI_MODEL || DEFAULT_MODEL, ...FALLBACK_MODELS])];
  const data = Buffer.from(jpeg).toString("base64");

  const losers = new AbortController();
  const signal = AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), losers.signal]);
  try {
    return await Promise.any(models.map((m) => readWithModel(m, key, data, signal)));
  } catch (err) {
    const errors = err instanceof AggregateError ? err.errors.filter((e): e is AppError => e instanceof AppError) : [];
    if (errors.length > 0 && errors.every((e) => e.status === 502)) throw errors[0]; // todos respondieron, pero nada legible
    throw readerUnavailable(errors.some((e) => e.status === 429) ? 429 : 503);
  } finally {
    losers.abort(); // el ganador ya terminó; corta a los que sigan esperando
  }
}
