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

export const uploadProof = async (saleId: string, photo: Blob) => {
  const form = new FormData();
  form.append("file", photo, "constancia.jpg");
  return (await api.post(`/sales/${saleId}/proof`, form)).data;
};

/** La imagen se pide con la sesión del navegador; el servidor valida el permiso en cada lectura. */
export const proofUrl = (saleId: string) => `/api/sales/${saleId}/proof`;
