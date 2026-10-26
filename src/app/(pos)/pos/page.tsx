import { requirePagePermission } from "@/lib/auth";
import { PosView } from "@/modules/sales/components/pos-view";

export default async function PosPage() {
  await requirePagePermission("sales.create");
  return <PosView />;
}
