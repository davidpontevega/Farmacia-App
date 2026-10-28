"use client";

import { cn } from "cn";
import type { PermissionCode } from "@/lib/permissions";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";

export type TabDef<T extends string> = { id: T; label: string; permission?: PermissionCode };

/** Atributos del panel que acompaña a un `TabBar` con el mismo `idPrefix`. */
export const tabPanelProps = (idPrefix: string, value: string) =>
  ({ role: "tabpanel", id: `${idPrefix}-panel`, "aria-labelledby": `${idPrefix}-tab-${value}` }) as const;

/**
 * Pestañas subrayadas para cambiar de vista (estándar de todas las pantallas). Las que exigen un permiso
 * que el usuario no tiene no se muestran. Flechas izquierda/derecha mueven y activan la pestaña.
 * Para filtros que se combinan se usan píldoras, no esto.
 */
export function TabBar<T extends string>({
  label,
  idPrefix,
  tabs,
  value,
  onChange,
}: {
  label: string;
  idPrefix: string;
  tabs: readonly TabDef<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const { can } = usePermissions();
  const visible = tabs.filter((t) => !t.permission || can(t.permission));

  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b"
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = buttons[(at + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
        next?.focus();
        next?.click();
      }}
    >
      {visible.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
