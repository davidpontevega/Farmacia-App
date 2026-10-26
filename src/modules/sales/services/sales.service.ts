import { api } from "@/lib/axios";
import type { CreateSaleInput, SalesRange } from "../schemas";
import type { CreateSaleResult, SaleSummary } from "../types";

export const createSale = async (input: CreateSaleInput) =>
  (await api.post<CreateSaleResult>("/sales", input)).data;

export const listShiftSales = async () =>
  (await api.get<SaleSummary[]>("/cash/shift/sales")).data;

export const listSales = async (range: SalesRange) =>
  (await api.get<SaleSummary[]>("/sales", { params: range })).data;

export const voidSale = async (id: string) => (await api.post(`/sales/${id}/void`)).data;
