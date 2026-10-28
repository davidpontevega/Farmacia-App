import { SideNav } from "./shell-nav";
import { TopBar } from "./top-bar";

/** Menú lateral agrupado, encabezado superior y contenido; igual para cajero y administrador (cada uno ve lo que su permiso permite). */
export function AppShell({ permissions, children }: { permissions: string[]; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <SideNav permissions={permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar permissions={permissions} />
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
