import { api } from "@/lib/axios";
import type { SalesRange } from "@/modules/sales/schemas";
import type { CreateReturnInput } from "../schemas";
import type { CreateReturnResult, LookupResponse, ReturnSummary } from "../types";

export const lookupTicket = async (ticket: string) =>
  (await api.get<LookupResponse>("/returns/lookup", { params: { ticket } })).data;

export const createReturn = async (input: CreateReturnInput) =>
  (await api.post<CreateReturnResult>("/returns", input)).data;

export const listReturns = async (range: SalesRange) =>
  (await api.get<ReturnSummary[]>("/returns", { params: range })).data;
