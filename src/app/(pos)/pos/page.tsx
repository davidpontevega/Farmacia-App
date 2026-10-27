import { requirePagePermission } from "@/lib/auth";
import { isProofStorageEnabled } from "@/server/storage/proof-blob";
import { PosView } from "@/modules/sales/components/pos-view";

export default async function PosPage() {
  await requirePagePermission("sales.create");
  return <PosView proofEnabled={isProofStorageEnabled()} />;
}
