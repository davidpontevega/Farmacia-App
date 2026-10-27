import { requirePagePermission } from "@/lib/auth";
import { isProofStorageEnabled } from "@/server/storage/proof-blob";
import { ShiftView } from "@/modules/cash/components/shift-view";

export default async function CashPage() {
  await requirePagePermission("cash.read");
  return <ShiftView proofEnabled={isProofStorageEnabled()} />;
}
