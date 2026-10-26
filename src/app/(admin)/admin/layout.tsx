import { redirect } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";
import { getAuthContext } from "@/lib/auth";
import { ADMIN_NAV_ITEMS } from "@/lib/nav";

// El layout solo exige algún permiso del área; cada página exige el suyo.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/no-access");
  if (!ADMIN_NAV_ITEMS.some((i) => ctx.permissions.includes(i.permission))) redirect("/pos");
  return <AppShell permissions={ctx.permissions}>{children}</AppShell>;
}
