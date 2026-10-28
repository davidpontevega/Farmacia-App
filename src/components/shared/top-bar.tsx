"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatLongDate, todayLima } from "@/lib/dates";
import { pageMeta } from "@/lib/nav";
import { CommandPalette } from "./command-palette";
import { setCollapsed, setMenuOpen, useMenuState } from "./menu-state";
import { ShiftStatus } from "./shell-nav";
import { UserMenu } from "./user-menu";

// El teclado se conoce solo en el navegador: el servidor pinta «Ctrl K» y el cliente lo corrige tras hidratar (sin desajuste).
const noop = () => () => {};
const detectMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

const toggleClass = "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-foreground transition-colors hover:bg-muted";

/**
 * Encabezado de todas las pantallas, en una sola fila: botón de menú (hamburguesa), título y subtítulo,
 * buscador «Ir a…», estado de la caja y usuario. El título es el único `h1` de la pantalla.
 */
export function TopBar({ permissions }: { permissions: string[] }) {
  const path = usePathname();
  const meta = pageMeta(path);
  const [palette, setPalette] = useState(false);
  const mac = useSyncExternalStore(noop, detectMac, () => false);
  const { collapsed, open } = useMenuState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Con otro diálogo abierto no se abre uno encima; si el abierto es el buscador, se cierra.
        setPalette((isOpen) => (isOpen ? false : !document.querySelector('[role="dialog"]')));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card px-4 py-2.5 md:px-6">
      {/* Un botón por pantalla: así cada uno anuncia su propio estado (plegado a iconos o desplegado). */}
      <button
        id="menu-movil"
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="menu-lateral"
        onClick={() => setMenuOpen(!open)}
        className={`${toggleClass} md:hidden`}
      >
        <Menu className="size-[18px]" aria-hidden="true" />
      </button>
      <button
        id="menu-escritorio"
        type="button"
        aria-label={collapsed ? "Expandir el menú" : "Contraer el menú"}
        aria-expanded={!collapsed}
        aria-controls="menu-lateral"
        onClick={() => setCollapsed(!collapsed)}
        className={`${toggleClass} hidden md:flex`}
      >
        <Menu className="size-[18px]" aria-hidden="true" />
      </button>

      <div className="flex min-w-[8rem] flex-1 flex-col leading-tight">
        <h1 className="truncate text-lg font-extrabold tracking-tight">{meta.title}</h1>
        {meta.subtitle && (
          <p suppressHydrationWarning className="truncate text-xs text-muted-foreground">
            {meta.dated ? `${formatLongDate(todayLima())} · ${meta.subtitle}` : meta.subtitle}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPalette(true)}
        aria-label="Ir a…"
        className="flex h-9 items-center gap-2 rounded-lg border bg-background px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted lg:min-w-44"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden flex-1 text-left lg:inline">Ir a…</span>
        <kbd className="hidden rounded border bg-card px-1.5 py-0.5 text-[11px] font-semibold lg:inline">{mac ? "⌘ K" : "Ctrl K"}</kbd>
      </button>

      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <ShiftStatus />
        <UserMenu showName />
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} permissions={permissions} />
    </header>
  );
}
