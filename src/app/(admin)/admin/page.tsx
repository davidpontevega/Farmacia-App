import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { ADMIN_NAV_ITEMS, canSee } from "@/lib/nav";

export default async function AdminIndex() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/no-access");
  const first = ADMIN_NAV_ITEMS.find((i) => canSee(i, ctx.permissions));
  redirect(first?.href ?? "/inicio");
}
