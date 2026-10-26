"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import { formatSoles } from "@/lib/money";
import type { SalesRange } from "@/modules/sales/schemas";
import { createReturn, listReturns, lookupTicket } from "../services/returns.service";

// Una devolución cambia stock, caja, kardex y el disponible de la venta.
const AFFECTED = ["return-lookup", "returns", "cash-shift", "products", "lots", "kardex"];

/** `ticket` vacío = sin búsqueda activa. Sin reintentos: un 404 o 409 es respuesta, no fallo. */
export const useReturnLookup = (ticket: string) =>
  useQuery({
    queryKey: ["return-lookup", ticket],
    queryFn: () => lookupTicket(ticket),
    enabled: ticket.length >= 3,
    retry: false,
  });

export const useReturns = (range: SalesRange | null) =>
  useQuery({
    queryKey: ["returns", range],
    queryFn: () => listReturns(range!),
    enabled: !!range,
  });

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReturn,
    onSuccess: (r) =>
      toast.success(`Devolución registrada · Reembolso ${formatSoles(r.refundedAmount)}`, {
        duration: 8000,
      }),
    onError: (err) => toast.error(apiErrorMessage(err)),
    // También al fallar: un 409 suele significar que el disponible cambió.
    onSettled: () => Promise.all(AFFECTED.map((key) => qc.invalidateQueries({ queryKey: [key] }))),
  });
}
