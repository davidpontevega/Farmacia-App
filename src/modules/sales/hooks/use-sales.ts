"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import type { SalesRange } from "../schemas";
import { createSale, listSales, listShiftSales, readPrescriptionPhoto, uploadProof, voidSale } from "../services/sales.service";

// Una venta cambia stock, totales del turno y listas de ventas.
const AFFECTED = ["cash-shift", "shift-sales", "sales", "products", "lots", "kardex"];

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all(AFFECTED.map((key) => qc.invalidateQueries({ queryKey: [key] })));
}

export const useShiftSales = () =>
  useQuery({ queryKey: ["shift-sales"], queryFn: listShiftSales });

export const useSales = (range: SalesRange | null) =>
  useQuery({
    queryKey: ["sales", range],
    queryFn: () => listSales(range!),
    enabled: !!range,
  });

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSale,
    // Éxito o error (409 de stock o de precios): refrescar para no vender con datos viejos.
    onSettled: () => invalidateAll(qc),
    onError: (err) =>
      toast.error(apiErrorMessage(err), {
        duration: axios.isAxiosError(err) && err.response?.status === 409 ? 8000 : 4000,
      }),
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: voidSale,
    onSuccess: () => toast.success("Venta anulada"),
    onError: (err) => toast.error(apiErrorMessage(err)),
    onSettled: () => invalidateAll(qc),
  });
}

type ProofUpload = { saleId: string; photo: Blob };

export function useUploadProof() {
  const qc = useQueryClient();
  const refresh = () => Promise.all(["shift-sales", "sales"].map((key) => qc.invalidateQueries({ queryKey: [key] })));

  // El reintento no usa la mutación: el diálogo de cobro ya se cerró y su observador no existe.
  const retry = async (v: ProofUpload) => {
    try {
      await uploadProof(v.saleId, v.photo);
      toast.success("Constancia guardada");
    } catch (err) {
      notifyFailure(err, v);
    } finally {
      await refresh();
    }
  };
  const notifyFailure = (err: unknown, v: ProofUpload) =>
    toast.error(`La venta se registró, pero la foto no se pudo subir: ${apiErrorMessage(err)}`, {
      duration: 15000,
      action: { label: "Reintentar", onClick: () => void retry(v) },
    });

  // Los avisos van aquí y no en el callback de `mutate()`: ese no corre si el componente ya se desmontó.
  return useMutation({
    mutationFn: ({ saleId, photo }: ProofUpload) => uploadProof(saleId, photo),
    onSuccess: () => toast.success("Constancia guardada"),
    onError: notifyFailure,
    onSettled: refresh,
  });
}

export const useReadPrescription = () =>
  useMutation({
    mutationFn: ({ crop, signal }: { crop: Blob; signal?: AbortSignal }) => readPrescriptionPhoto(crop, signal),
  });
