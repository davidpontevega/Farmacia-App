import { requirePagePermission } from "@/lib/auth";
import { ReportsView } from "@/modules/reports/components/reports-view";

export default async function ReportsPage() {
  await requirePagePermission("reports.read");
  return <ReportsView />;
}
