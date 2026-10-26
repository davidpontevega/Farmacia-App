import { requirePagePermission } from "@/lib/auth";
import { ReturnsTable } from "@/modules/returns/components/returns-table";

export default async function ReturnsListPage() {
  await requirePagePermission("returns.read");
  return <ReturnsTable />;
}
