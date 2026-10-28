"use client";

import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/dates";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { useDeleteMiss, useMisses } from "../hooks/use-misses";

/** Lo que se buscó y no se encontró (últimos 90 días), para decidir qué agregar al diccionario. Solo administración. */
export function MissesPanel() {
  const { can } = usePermissions();
  const allowed = can("shortages.read");
  const { data, isLoading, error } = useMisses(allowed);
  const remove = useDeleteMiss();
  if (!allowed) return null;

  return (
    <section className="card-surface p-5">
      <h2 className="text-sm font-semibold">Consultas sin resultado</h2>
      <p className="mb-3 text-xs text-muted-foreground">Lo que más se busca y no está en el diccionario (últimos 90 días). No guarda quién consultó. Si aparece un nombre de persona, quítalo.</p>
      {isLoading && <Skeleton aria-busy="true" aria-label="Cargando" className="h-16 w-full" />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(error)}
        </p>
      )}
      {data && data.length === 0 && <EmptyState icon={SearchX} title="Todavía no hay consultas sin resultado" description="Lo que se busque y no esté en el diccionario aparecerá aquí." />}
      {data && data.length > 0 && (
        <ul className="flex flex-col divide-y">
          {data.map((m) => (
            <li key={m.id} className="flex min-h-11 items-center justify-between gap-3 py-1 text-sm">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{m.query}</span>
                <span className="text-xs text-muted-foreground">
                  {m.count} {m.count === 1 ? "vez" : "veces"} · última {formatDateTime(m.lastAt)}
                </span>
              </span>
              {can("products.update") && (
                <Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(m.id)} aria-label={`Quitar «${m.query}»`}>
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
