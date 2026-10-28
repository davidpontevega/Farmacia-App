"use client";

import { ClipboardList, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatLongDate, todayLima } from "@/lib/dates";
import { pageMeta } from "@/lib/nav";
import { CommandPalette } from "./command-palette";
import { ShiftStatus } from "./shell-nav";
import { UserMenu } from "./user-menu";

export const OPEN_PRESCRIPTION_EVENT = "nicfarma:abrir-receta";

const prescriptionButton = "flex h-11 items-center gap-2 rounded-xl border border-primary bg-card px-4 text-sm font-bold text-primary transition-colors hover:bg-secondary";

// El teclado se conoce solo en el navegador: el servidor pinta «Ctrl K» y el cliente lo corrige tras hidratar (sin desajuste).
const noop = () => () => {};
const detectMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Encabezado de todas las pantallas: título y subtítulo, buscador «Ir a…», acciones rápidas, estado de la caja y usuario.
 * El título es el único `h1` de la pantalla.
 */
export function TopBar({ permissions }: { permissions: string[] }) {
  const path = usePathname();
  const meta = pageMeta(path);
  const [palette, setPalette] = useState(false);
  const canSell = permissions.includes("sales.create");
  const mac = useSyncExternalStore(noop, detectMac, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Con otro diálogo abierto no se abre uno encima; si el abierto es el buscador, se cierra.
        setPalette((open) => (open ? false : !document.querySelector('[role="dialog"]')));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b bg-card px-4 py-4 md:px-8">
      <div className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
        <h1 className="text-2xl font-extrabold tracking-tight">{meta.title}</h1>
        {meta.subtitle && <p suppressHydrationWarning className="text-sm text-muted-foreground">{meta.dated ? `${formatLongDate(todayLima())} · ${meta.subtitle}` : meta.subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="flex h-11 items-center gap-2 rounded-xl border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:min-w-52"
        >
          <Search className="size-[18px]" aria-hidden="true" />
          <span className="flex-1 text-left">Ir a…</span>
          <kbd className="hidden rounded-md border bg-card px-1.5 py-0.5 text-xs font-semibold md:inline">{mac ? "⌘ K" : "Ctrl K"}</kbd>
        </button>
        {canSell && !path.startsWith("/pos") && (
          <Link href="/pos" className="flex h-11 items-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-success/90">
            <Plus className="size-[18px]" aria-hidden="true" />
            Nueva venta
          </Link>
        )}
        {canSell &&
          (path.startsWith("/pos") ? (
            // Ya estás en el punto de venta: se le avisa para que abra el diálogo (no hay navegación que lo provoque).
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PRESCRIPTION_EVENT))} className={prescriptionButton}>
              <ClipboardList className="size-[18px]" aria-hidden="true" />
              Receta
            </button>
          ) : (
            <Link href="/pos?receta=1" className={prescriptionButton}>
              <ClipboardList className="size-[18px]" aria-hidden="true" />
              Receta
            </Link>
          ))}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <ShiftStatus />
        <UserMenu showName />
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} permissions={permissions} />
    </header>
  );
}
