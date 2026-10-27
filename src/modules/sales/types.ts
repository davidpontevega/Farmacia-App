import type { PaymentMethod } from "@/lib/sales";

// Formas JSON de la API de ventas. Montos en centavos; fechas ISO.
export type SaleStatus = "COMPLETED" | "VOIDED";

export type SaleSummary = {
  id: string;
  ticketNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  yapeAmount: number;
  status: SaleStatus;
  userName: string;
  /** Hay foto de la transferencia guardada (la ruta no sale del servidor). */
  hasProof: boolean;
};

export type SaleItemRow = {
  productName: string;
  lotNumber: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SaleDetail = SaleSummary & { items: SaleItemRow[] };

export type CreateSaleResult = {
  id: string;
  ticketNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  yapeAmount: number;
  change: number;
  createdAt: string;
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  YAPE: "Yape / Plin",
  MIXED: "Mixto",
};

export const SALES_LIST_LIMIT = 200;
