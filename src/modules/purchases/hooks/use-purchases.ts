"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import { formatSoles } from "@/lib/money";
import type { SalesRange } from "@/modules/sales/schemas";
import {
  catalogNames,
  createPurchase,
  listPurchases,
  searchSuppliers,
  supplierLinks,
} from "../services/purchases.service";

// Una compra cambia stock, productos nuevos o precios, kardex, historial y lo aprendido del proveedor.
const AFFECTED = ["purchases", "products", "lots", "kardex", "suppliers", "supplier-links", "catalog-names", "shortages"];

export const usePurchases = (range: SalesRange | null) =>
  useQuery({
    queryKey: ["purchases", range],
    queryFn: () => listPurchases(range!),
    enabled: !!range,
  });

export const useSupplierSuggestions = (q: string) =>
  useQuery({
    queryKey: ["suppliers", q],
    queryFn: () => searchSuppliers(q),
    placeholderData: keepPreviousData,
  });

export const useSupplierLinks = (supplierId: string | null) =>
  useQuery({
    queryKey: ["supplier-links", supplierId],
    queryFn: () => supplierLinks(supplierId!),
    enabled: !!supplierId,
  });

/** Nombres de todo el catálogo activo: emparejar una descripción es instantáneo, sin red. */
export const useCatalogNames = () =>
  useQuery({ queryKey: ["catalog-names"], queryFn: catalogNames, staleTime: 60_000 });

/** `onRegistered` corre siempre (también si el formulario se cerró durante la petición). */
export function useCreatePurchase(onRegistered?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPurchase,
    onSuccess: (r) => {
      toast.success(`Compra registrada · Total ${formatSoles(r.total)}`, { duration: 6000 });
      onRegistered?.();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
    onSettled: () => Promise.all(AFFECTED.map((key) => qc.invalidateQueries({ queryKey: [key] }))),
  });
}
