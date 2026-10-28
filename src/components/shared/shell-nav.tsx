"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Menu,
  Package,
  PackageX,
  Receipt,
  Stethoscope,
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
import { useActiveShift } from "@/modules/cash/hooks/use-cash";

export type NavLink = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  "/pos": ShoppingCart,
  "/caja": Vault,
  "/consulta": Stethoscope,
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

function useActive(href: string) {
  const path = usePathname();
  return path === href || path.startsWith(`${href}/`);
}

function Item({ link, onNavigate }: { link: NavLink; onNavigate?: () => void }) {
  const active = useActive(link.href);
  const Icon = ICONS[link.href] ?? Package;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
        active ? "bg-secondary font-semibold text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      {link.label}
    </Link>
  );
}

/** Menú lateral (≥ md) y plegable bajo la barra superior (< md). */
export function SideNav({ links, user, userCard }: { links: NavLink[]; user: React.ReactNode; userCard: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <>
      <header className="flex items-center justify-between border-b bg-card px-4 py-2 md:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          {user}
          <button
            ref={toggle}
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="menu-lateral"
            onClick={() => setOpen((v) => !v)}
            className="flex size-11 items-center justify-center rounded-lg border"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
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
          "flex-col gap-6 border-r bg-card p-4 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto",
          open ? "flex" : "hidden",
        )}
      >
        <div className="hidden px-2 md:block">
          <Brand />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {links.map((l) => (
            <Item key={l.href} link={l} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <ShiftStatus />
          <div className="hidden items-center gap-3 rounded-xl bg-muted p-3 md:flex">{userCard}</div>
        </div>
      </aside>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-bold tracking-tight">{BRAND.name}</span>
        <span className="text-xs text-muted-foreground">{BRAND.tagline}</span>
      </span>
    </div>
  );
}

export function ShiftStatus() {
  const { data } = useActiveShift();
  if (!data) return null;
  const open = data.shift !== null;
  return (
    <span
      className={cn(
        "flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        open ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
      )}
    >
      <span className={cn("size-2 rounded-full", open ? "bg-chart-2" : "bg-warning-ring")} aria-hidden="true" />
      {data.shift ? `Caja abierta · ${formatDateTime(data.shift.openedAt)}` : "Sin turno abierto"}
    </span>
  );
}
