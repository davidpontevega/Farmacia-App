import { READ_MAX_SIDE, type Crop } from "./prescription-read";

/** Dibuja `source` (todo o un recorte en fracciones) con lado mayor máximo y lo codifica JPEG. Re-codificar quita los metadatos de la foto. */
async function toJpeg(file: Blob, maxSide: number, quality: number, crop?: Crop): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); // igual que el <img> donde se dibuja el recorte
  const sx = Math.round((crop?.x ?? 0) * bitmap.width);
  const sy = Math.round((crop?.y ?? 0) * bitmap.height);
  const sw = Math.max(1, Math.round((crop?.w ?? 1) * bitmap.width));
  const sh = Math.max(1, Math.round((crop?.h ?? 1) * bitmap.height));
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo reducir la foto");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo reducir la foto"))), "image/jpeg", quality),
  );
}

/** Reduce una foto en el navegador: lado mayor máximo y JPEG, para subir menos de ~500 KB. */
export const shrinkImage = (file: Blob, maxSide = 1280, quality = 0.7) => toJpeg(file, maxSide, quality);

/** Solo la zona recortada, reducida y en JPEG: es lo único que sale del equipo en la lectura de recetas. */
export const cropAndShrink = (file: Blob, crop: Crop) => toJpeg(file, READ_MAX_SIDE, 0.8, crop);
