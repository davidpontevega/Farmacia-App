import { api } from "@/lib/axios";
import type { CatalogName } from "@/lib/match";
import type { SalesRange } from "@/modules/sales/schemas";
import type { CreatePurchaseInput } from "../schemas";
import type {
  CreatePurchaseResult,
  PurchaseDetail,
  PurchaseSummary,
  SupplierLink,
  SupplierOption,
} from "../types";

export const createPurchase = async (input: CreatePurchaseInput) =>
  (await api.post<CreatePurchaseResult>("/purchases", input)).data;

export const listPurchases = async (range: SalesRange) =>
  (await api.get<PurchaseSummary[]>("/purchases", { params: range })).data;

export const getPurchase = async (id: string) => (await api.get<PurchaseDetail>(`/purchases/${id}`)).data;

export const searchSuppliers = async (q: string) =>
  (await api.get<SupplierOption[]>("/suppliers", { params: { q } })).data;

export const supplierLinks = async (supplierId: string) =>
  (await api.get<SupplierLink[]>(`/suppliers/${supplierId}/products`)).data;

export const catalogNames = async () => (await api.get<CatalogName[]>("/products/names")).data;
