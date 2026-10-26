import { redirect } from "next/navigation";
import { AppShell } from "@/components/shared/app-shell";
import { getAuthContext } from "@/lib/auth";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/no-access");
  return <AppShell permissions={ctx.permissions}>{children}</AppShell>;
}
