import { requirePagePermission } from "@/lib/auth";
import { InventoryView } from "@/modules/inventory/components/inventory-view";

export default async function InventoryPage() {
  await requirePagePermission("lots.read");
  return <InventoryView />;
}
