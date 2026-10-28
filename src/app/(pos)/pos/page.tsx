import { requirePagePermission } from "@/lib/auth";
import { isPrescriptionReaderEnabled } from "@/server/ai/prescription-reader";
import { isProofStorageEnabled } from "@/server/storage/proof-blob";
import { PosView } from "@/modules/sales/components/pos-view";

// `?receta=1` (botón «Receta» del encabezado) abre el diálogo de receta al cargar.
export default async function PosPage({ searchParams }: { searchParams: Promise<{ receta?: string }> }) {
  await requirePagePermission("sales.create");
  const { receta } = await searchParams;
  return <PosView proofEnabled={isProofStorageEnabled()} readerEnabled={isPrescriptionReaderEnabled()} openPrescription={receta === "1"} />;
}
