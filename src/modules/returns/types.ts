import type { SaleStatus } from "@/modules/sales/types";

// Formas JSON de la API de devoluciones. Montos en centavos; fechas ISO.
export type LookupLine = {
  saleItemId: string;
  productName: string;
  lotNumber: string;
  quantity: number;
  unitPrice: number;
  returned: number;
  available: number;
};

export type LookupResponse = {
  sale: { id: string; ticketNumber: string; createdAt: string; total: number; status: SaleStatus };
  /** Solo las líneas con unidades por devolver; vacío si la venta está anulada o ya se devolvió todo. */
  lines: LookupLine[];
};

export type ReturnSummary = {
  id: string;
  createdAt: string;
  ticketNumber: string;
  userName: string;
  reason: string;
  refundedAmount: number;
};

export type CreateReturnResult = { id: string; ticketNumber: string; refundedAmount: number };

export const RETURNS_LIST_LIMIT = 200;
export const LOOKUP_DAYS = 90;

export const CONDITION_LABEL = { GOOD: "Bueno", DAMAGED: "Dañado" } as const;
