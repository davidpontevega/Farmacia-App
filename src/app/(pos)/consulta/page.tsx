import { requirePagePermission } from "@/lib/auth";
import { ConsultView } from "@/modules/consult/components/consult-view";

export default async function ConsultPage() {
  await requirePagePermission("products.read");
  return <ConsultView />;
}
