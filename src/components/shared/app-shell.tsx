import { NAV_ITEMS } from "@/lib/nav";
import { SideNav } from "./shell-nav";
import { UserMenu } from "./user-menu";

/** Menú lateral con lo que el usuario puede ver; igual para cajero y administrador. */
export function AppShell({ permissions, children }: { permissions: string[]; children: React.ReactNode }) {
  const links = NAV_ITEMS.filter((i) => permissions.includes(i.permission)).map(({ href, label }) => ({ href, label }));
  const user = <UserMenu />;
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <SideNav links={links} user={user} userCard={<UserMenu showName />} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
