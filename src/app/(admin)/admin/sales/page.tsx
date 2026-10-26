import { requirePagePermission } from "@/lib/auth";
import { SalesTable } from "@/modules/sales/components/sales-table";

export default async function SalesPage() {
  await requirePagePermission("reports.read");
  return <SalesTable />;
}
