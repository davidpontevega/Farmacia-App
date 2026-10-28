"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  BarChart3,
  ClipboardList,
  Home,
  Package,
  PackageX,
  Receipt,
  Search,
  ShoppingCart,
  Truck,
  Undo2,
  Users,
  Vault,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { BRAND } from "@/lib/brand";
import { formatDateTime } from "@/lib/dates";
import { groupNav, NAV_ITEMS, type NavItem } from "@/lib/nav";
import { useActiveShift } from "@/modules/cash/hooks/use-cash";
import { useNavCounters } from "@/modules/home/hooks/use-home";
import { setMenuOpen, useMenuState } from "./menu-state";

export const ICONS: Record<string, LucideIcon> = {
  "/inicio": Home,
  "/pos": ShoppingCart,
  "/caja": Vault,
  "/consulta": Search,
  "/devoluciones": Undo2,
  "/admin/products": Package,
  "/admin/inventory": Warehouse,
  "/admin/purchases": Truck,
  "/admin/shortages": PackageX,
  "/admin/sales": Receipt,
  "/admin/reports": BarChart3,
  "/admin/returns": ClipboardList,
  "/admin/users": Users,
};

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-extrabold tracking-tight">{BRAND.name}</span>
          <span className="text-[11px] text-sidebar-muted">{BRAND.tagline}</span>
        </span>
      )}
    </div>
  );
}

/** Estado de la caja del usuario: el mismo texto de siempre, y «Turno vencido» en rojo si es de un día anterior. */
export function ShiftStatus() {
  const { data } = useActiveShift();
  if (!data) return null;
  const shift = data.shift;
  const tone = shift === null ? "warn" : shift.stale ? "bad" : "ok";
  return (
    <span
      role="status"
      className={cn(
        "flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "ok" && "bg-success-soft text-success",
        tone === "warn" && "bg-warning-soft text-warning",
        tone === "bad" && "bg-destructive/10 text-destructive",
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone === "ok" && "bg-chart-2", tone === "warn" && "bg-warning-ring", tone === "bad" && "bg-destructive")} aria-hidden="true" />
      {shift === null ? "Sin turno abierto" : shift.stale ? `Turno vencido · ${formatDateTime(shift.openedAt)}` : `Caja abierta · ${formatDateTime(shift.openedAt)}`}
    </span>
  );
}

function useActive(href: string) {
  const path = usePathname();
  return path === href || path.startsWith(`${href}/`);
}

function Item({ item, collapsed, count }: { item: NavItem; collapsed: boolean; count: number }) {
  const active = useActive(item.href);
  const Icon = ICONS[item.href] ?? Package;
  const tone = item.counter === "alerts" ? "bg-destructive text-white" : "bg-warning-ring text-black";
  return (
    <Link
      href={item.href}
      onClick={() => setMenuOpen(false)}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? `${item.label}${count > 0 ? `, ${count}` : ""}` : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
        collapsed && "md:size-10 md:justify-center md:px-0",
        active ? "bg-sidebar-accent font-bold text-sidebar-accent-foreground" : "font-medium text-sidebar-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className={cn("flex-1", collapsed && "md:sr-only")}>{item.label}</span>
      {count > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
            tone,
            collapsed && "md:absolute md:right-1 md:top-1 md:size-2 md:min-w-0 md:p-0 md:text-[0px]",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Menú lateral agrupado. Se pliega a iconos (≥ md) o se despliega bajo el encabezado (< md) con el botón de hamburguesa del encabezado. */
export function SideNav({ permissions }: { permissions: string[] }) {
  const { collapsed, open } = useMenuState();
  const path = usePathname();
  const qc = useQueryClient();
  const { data: counters } = useNavCounters();
  const sections = groupNav(NAV_ITEMS, permissions);

  // Al cambiar de pantalla se refrescan los contadores (lo que acabas de hacer puede haberlos cambiado).
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["nav-counters"] });
  }, [path, qc]);

  return (
    <>
    {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
    <aside
      id="menu-lateral"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setMenuOpen(false);
          document.getElementById("menu-movil")?.focus();
        }
      }}
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 flex-col gap-4 overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:sticky md:top-0 md:z-auto md:flex md:h-screen md:shrink-0",
        collapsed ? "md:w-[68px] md:items-center md:px-2.5" : "md:w-56",
        open ? "flex shadow-xl md:shadow-none" : "hidden",
      )}
    >
      <Link
        href="/inicio"
        onClick={() => setMenuOpen(false)}
        aria-label={`${BRAND.name}: ir al inicio`}
        aria-current={path === "/inicio" ? "page" : undefined}
        title="Ir al inicio"
        className={cn("rounded-xl outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring", !collapsed && "px-1.5")}
      >
        <Brand compact={collapsed} />
      </Link>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-3">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-0.5">
            <span className={cn("px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted", collapsed && "md:sr-only")}>{section.title}</span>
            {section.items.map((item) => (
              <Item key={item.href} item={item} collapsed={collapsed} count={item.counter ? (counters?.[item.counter] ?? 0) : 0} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
    </>
  );
}
