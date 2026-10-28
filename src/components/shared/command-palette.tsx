"use client";

import { Package, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { canSee, filterNav, NAV_ITEMS, type NavItem } from "@/lib/nav";
import { ICONS } from "./shell-nav";

function Palette({ permissions, onClose }: { permissions: string[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = filterNav(query, NAV_ITEMS.filter((i) => canSee(i, permissions)));
  const active = Math.min(index, Math.max(results.length - 1, 0));

  const go = (item: NavItem | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Ir a una pantalla</DialogTitle>
        <DialogDescription className="sr-only">Escribe para filtrar; usa las flechas y Enter para ir.</DialogDescription>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="ir-a-lista"
            aria-activedescendant={results[active] ? `ir-a-${active}` : undefined}
            aria-label="Ir a"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex(Math.min(active + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex(Math.max(active - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Ir a…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul id="ir-a-lista" role="listbox" aria-label="Pantallas" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Ninguna pantalla coincide</li>}
          {results.map((item, i) => {
            const Icon = ICONS[item.href] ?? Package;
            return (
              <li
                key={item.href}
                id={`ir-a-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setIndex(i)}
                onClick={() => go(item)}
                className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm", i === active ? "bg-secondary font-semibold text-secondary-foreground" : "text-foreground")}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.section}</span>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** Buscador «Ir a…» (Ctrl+K): se monta al abrir, así siempre arranca vacío. */
export function CommandPalette({ open, onClose, permissions }: { open: boolean; onClose: () => void; permissions: string[] }) {
  return open ? <Palette permissions={permissions} onClose={onClose} /> : null;
}
