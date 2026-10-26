import { requirePagePermission } from "@/lib/auth";
import { PurchasesView } from "@/modules/purchases/components/purchases-view";

export default async function PurchasesPage() {
  await requirePagePermission("purchases.create");
  return <PurchasesView />;
}
