"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import { deleteMiss, listMisses, reportMiss } from "../services/consult.service";

export const useMisses = (enabled: boolean) => useQuery({ queryKey: ["consult-misses"], queryFn: listMisses, enabled });

/** Es una métrica de apoyo: si falla no se le avisa al cajero ni se interrumpe la consulta. */
export const useReportMiss = () =>
  useMutation({
    mutationFn: reportMiss,
    onError: (err) => console.error("No se pudo anotar la consulta sin resultado", err instanceof Error ? err.name : "error"),
  });

export function useDeleteMiss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMiss,
    onSuccess: () => toast.success("Consulta quitada"),
    onError: (err) => toast.error(apiErrorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["consult-misses"] }),
  });
}
