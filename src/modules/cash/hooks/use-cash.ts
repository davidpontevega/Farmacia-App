"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import { formatSoles, formatSolesSigned } from "@/lib/money";
import { addMovement, closeShift, getActiveShift, openShift } from "../services/cash.service";

const KEY = ["cash-shift"];

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
