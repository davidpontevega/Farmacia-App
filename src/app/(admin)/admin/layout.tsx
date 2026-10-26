import { redirect } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";
import { getAuthContext } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/no-access");
  if (!ctx.permissions.includes("users.read")) redirect("/pos");
  return <AppShell permissions={ctx.permissions}>{children}</AppShell>;
}
