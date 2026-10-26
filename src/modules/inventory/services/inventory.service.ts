import { api } from "@/lib/axios";
import type { AdjustmentInput, CreateLotInput, KardexQuery } from "../schemas";
import type { KardexRow, LotRow } from "../types";

export const listLots = async (productId: string) =>
  (await api.get<LotRow[]>(`/products/${productId}/lots`)).data;

export const createLot = async (productId: string, input: CreateLotInput) =>
  (await api.post<{ id: string }>(`/products/${productId}/lots`, input)).data;

export const adjustStock = async (input: AdjustmentInput) =>
  (await api.post<{ stock: number }>("/inventory/adjustments", input)).data;

export const listKardex = async (params: KardexQuery) =>
  (await api.get<KardexRow[]>("/inventory/kardex", { params })).data;
