"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import { formatSoles, formatSolesSigned } from "@/lib/money";
import { addMovement, closeShift, forceCloseShift, getActiveShift, getLocalOpenShift, openShift } from "../services/cash.service";

const KEY = ["cash-shift"];
const LOCAL_KEY = [...KEY, "local"];

export const useActiveShift = () =>
  useQuery({ queryKey: KEY, queryFn: getActiveShift });

function useCashMutation<V, R>(
  fn: (v: V) => Promise<R>,
  success: (result: R) => string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => toast.success(success(result)),
    onError: (err) => toast.error(apiErrorMessage(err)),
    // También al fallar: un 409 suele significar que el turno cambió en otra pestaña.
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export const useOpenShift = () => useCashMutation(openShift, () => "Turno abierto");

export const useAddMovement = () => useCashMutation(addMovement, () => "Movimiento registrado");

export const useCloseShift = () =>
  useCashMutation(
    closeShift,
    (r) =>
      `Turno cerrado. Efectivo: ${formatSolesSigned(r.differenceCash)} · Yape: ${formatSolesSigned(r.differenceYape)} (esperado ${formatSoles(r.expectedCash)} / ${formatSoles(r.expectedYape)})`,
  );

/** Quién tiene la caja ahora (solo se consulta cuando yo no tengo turno). */
export const useLocalOpenShift = (enabled: boolean) => useQuery({ queryKey: LOCAL_KEY, queryFn: getLocalOpenShift, enabled });

export const useForceCloseShift = () =>
  useCashMutation(forceCloseShift, (r) =>
    r.mode === "NO_COUNT"
      ? "Turno cerrado sin cuadre"
      : `Turno cerrado. Efectivo: ${formatSolesSigned(r.differenceCash)} · Yape: ${formatSolesSigned(r.differenceYape)}`,
  );
