import { requirePagePermission } from "@/lib/auth";
import { ReturnsView } from "@/modules/returns/components/returns-view";

export default async function ReturnsPage() {
  await requirePagePermission("returns.create");
  return <ReturnsView />;
}
