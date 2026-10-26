"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import type { AdjustmentInput, CreateLotInput, KardexQuery } from "../schemas";
import { adjustStock, createLot, listKardex, listLots } from "../services/inventory.service";

export const useLots = (productId: string | null) =>
  useQuery({
    queryKey: ["lots", productId],
    queryFn: () => listLots(productId!),
    enabled: !!productId,
  });

export const useKardex = (filters: KardexQuery) =>
  useQuery({ queryKey: ["kardex", filters], queryFn: () => listKardex(filters) });

// Un lote o un ajuste cambia stock, próximo vencimiento y kardex.
function useStockMutation<V>(fn: (v: V) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success);
      return Promise.all(
        ["lots", "products", "kardex"].map((key) => qc.invalidateQueries({ queryKey: [key] })),
      );
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export const useCreateLot = (productId: string) =>
  useStockMutation((input: CreateLotInput) => createLot(productId, input), "Lote registrado");

export const useAdjustStock = () =>
  useStockMutation((input: AdjustmentInput) => adjustStock(input), "Stock ajustado");
