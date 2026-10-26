import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { ADMIN_NAV_ITEMS } from "@/lib/nav";

export default async function AdminIndex() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/no-access");
  const first = ADMIN_NAV_ITEMS.find((i) => ctx.permissions.includes(i.permission));
  redirect(first?.href ?? "/pos");
}
