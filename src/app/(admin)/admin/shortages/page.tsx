import { requirePagePermission } from "@/lib/auth";
import { ShortagesView } from "@/modules/shortages/components/shortages-view";

export default async function ShortagesPage() {
  await requirePagePermission("shortages.read");
  return <ShortagesView />;
}
