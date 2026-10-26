// Páginas de un PDF como imágenes, de una en una, para pasarlas por el mismo OCR que una foto.
const MIN_WIDTH = 2000;
const MAX_PIXELS = 24_000_000;
export const MAX_PDF_PAGES = 10;

export type PdfSource = {
  numPages: number;
  render: (pageNumber: number) => Promise<HTMLCanvasElement>;
  close: () => Promise<void>;
};

export async function openPdf(file: File): Promise<PdfSource> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  return {
    numPages: doc.numPages,
    render: async (pageNumber) => {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(Math.max(1, MIN_WIDTH / base.width), Math.sqrt(MAX_PIXELS / (base.width * base.height))) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      page.cleanup();
      return canvas;
    },
    close: () => task.destroy(),
  };
}
