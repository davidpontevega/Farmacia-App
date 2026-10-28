"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Home,
  Menu,
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
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { BRAND } from "@/lib/brand";
import { formatDateTime } from "@/lib/dates";
import { groupNav, NAV_ITEMS, type NavItem } from "@/lib/nav";
import { useActiveShift } from "@/modules/cash/hooks/use-cash";
import { useNavCounters } from "@/modules/home/hooks/use-home";

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

// El menú se puede plegar a solo iconos; se recuerda en el navegador (si no hay almacenamiento, funciona igual).
const COLLAPSED_KEY = "nicfarma:menu-plegado";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    /* sin almacenamiento: el cambio dura hasta recargar */
  }
  listeners.forEach((l) => l());
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-extrabold tracking-tight">{BRAND.name}</span>
          <span className="text-xs text-sidebar-muted">{BRAND.tagline}</span>
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
        "flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        tone === "ok" && "bg-success-soft text-success",
        tone === "warn" && "bg-warning-soft text-warning",
        tone === "bad" && "bg-destructive/10 text-destructive",
      )}
    >
      <span className={cn("size-2 rounded-full", tone === "ok" && "bg-chart-2", tone === "warn" && "bg-warning-ring", tone === "bad" && "bg-destructive")} aria-hidden="true" />
      {shift === null ? "Sin turno abierto" : shift.stale ? `Turno vencido · ${formatDateTime(shift.openedAt)}` : `Caja abierta · ${formatDateTime(shift.openedAt)}`}
    </span>
  );
}

function useActive(href: string) {
  const path = usePathname();
  return path === href || path.startsWith(`${href}/`);
}

function Item({ item, collapsed, count, onNavigate }: { item: NavItem; collapsed: boolean; count: number; onNavigate?: () => void }) {
  const active = useActive(item.href);
  const Icon = ICONS[item.href] ?? Package;
  const tone = item.counter === "alerts" ? "bg-destructive text-white" : "bg-warning-ring text-black";
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? `${item.label}${count > 0 ? `, ${count}` : ""}` : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
        collapsed && "md:size-12 md:justify-center md:px-0",
        active ? "bg-sidebar-primary font-bold text-sidebar-primary-foreground" : "font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className={cn("flex-1", collapsed && "md:sr-only")}>{item.label}</span>
      {count > 0 && (
        <span
          className={cn(
            "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs font-bold",
            tone,
            collapsed && "md:absolute md:right-1.5 md:top-1.5 md:size-2.5 md:min-w-0 md:p-0 md:text-[0px]",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Menú lateral agrupado (≥ md, plegable a iconos) y plegable bajo la barra superior (< md). */
export function SideNav({ permissions }: { permissions: string[] }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
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
      <header className="flex items-center justify-between bg-sidebar px-4 py-2 text-sidebar-foreground md:hidden">
        <Brand />
        <button
          ref={toggle}
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="menu-lateral"
          onClick={() => setOpen((v) => !v)}
          className="flex size-11 items-center justify-center rounded-lg border border-sidebar-border"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      <aside
        id="menu-lateral"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            toggle.current?.focus();
          }
        }}
        className={cn(
          "flex-col gap-5 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:overflow-y-auto",
          collapsed ? "md:w-[76px] md:items-center md:px-3" : "md:w-64",
          open ? "flex" : "hidden",
        )}
      >
        <div className={cn("hidden md:block", !collapsed && "px-2")}>
          <Brand compact={collapsed} />
        </div>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-4">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-0.5">
              <span className={cn("px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-sidebar-muted", collapsed && "md:sr-only")}>{section.title}</span>
              {section.items.map((item) => (
                <Item
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  count={item.counter ? (counters?.[item.counter] ?? 0) : 0}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => writeCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir el menú" : "Contraer el menú"}
          title={collapsed ? "Expandir el menú" : "Contraer el menú"}
          className="hidden min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:flex"
        >
          {collapsed ? <ChevronsRight className="size-5" aria-hidden="true" /> : <ChevronsLeft className="size-5" aria-hidden="true" />}
          {!collapsed && "Contraer menú"}
        </button>
      </aside>
    </>
  );
}
