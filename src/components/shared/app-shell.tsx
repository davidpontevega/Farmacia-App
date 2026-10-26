import Link from "next/link";
import { ClerkLoaded, UserButton } from "@clerk/nextjs";
import { NAV_ITEMS } from "@/lib/nav";

export function AppShell({
  permissions,
  children,
}: {
  permissions: string[];
  children: React.ReactNode;
}) {
  const items = NAV_ITEMS.filter((i) => permissions.includes(i.permission));
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold">Farmacia POS</span>
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="text-muted-foreground hover:text-foreground">
              {i.label}
            </Link>
          ))}
        </nav>
        <ClerkLoaded>
          <UserButton />
        </ClerkLoaded>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
