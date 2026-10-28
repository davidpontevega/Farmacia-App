import type { LucideIcon } from "lucide-react";

/** Lista o tabla sin datos: un icono, qué pasa y, si aplica, qué hacer (spec 023). */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary" aria-hidden="true">
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
