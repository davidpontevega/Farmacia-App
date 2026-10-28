"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import type { CreateShortagesInput } from "../schemas";
import { createShortages, listShortages, resolveShortage } from "../services/shortages.service";
import type { ShortageStatus } from "../types";

export const useShortages = (status: ShortageStatus) => useQuery({ queryKey: ["shortages", status], queryFn: () => listShortages(status) });

export function useCreateShortages() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["shortages"] });
  const report = (r: { created: number; skipped: number }) =>
    toast.success(r.created > 0 ? `${r.created} ${r.created === 1 ? "faltante anotado" : "faltantes anotados"}` : "Ya estaba anotado hace poco");

  // El reintento no usa la mutación: desde el diálogo de receta (ya cerrado) su observador no existe.
  const retry = async (input: CreateShortagesInput) => {
    try {
      report(await createShortages(input));
    } catch (err) {
      notifyFailure(err, input);
    } finally {
      await refresh();
    }
  };
  const notifyFailure = (err: unknown, input: CreateShortagesInput) =>
    toast.error(`No se pudieron anotar los faltantes: ${apiErrorMessage(err)}`, {
      duration: 15000,
      action: { label: "Reintentar", onClick: () => void retry(input) },
    });

  // Los avisos van aquí y no en el callback de `mutate()`: ese no corre si el componente ya se desmontó.
  return useMutation({
    mutationFn: createShortages,
    onSuccess: report,
    onError: notifyFailure,
    onSettled: refresh,
  });
}

export function useResolveShortage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resolveShortage,
    onSuccess: (_r, v) => toast.success(v.status === "ORDERED" ? "Marcado como pedido" : "Descartado"),
    onError: (err) => toast.error(apiErrorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["shortages"] }),
  });
}
