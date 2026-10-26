import type { DayRow, StockStatus } from "@/lib/reports";

export type SalesSort = "units" | "amount" | "profit";

export type SalesReport = {
  from: string;
  to: string;
  /** Ventas completadas del período, sin restar devoluciones. */
  grossCents: number;
  /** Reembolsos de devoluciones hechas en el período. */
  refundCents: number;
  netCents: number;
  salesCount: number;
  /** Ticket promedio: ventas completadas ÷ número de ventas. */
  averageTicketCents: number;
  /** Costo de lo vendido, menos el costo de lo devuelto en buen estado. */
  costCents: number;
  profitCents: number;
  marginPct: number | null;
  voided: { count: number; cents: number };
  byMethod: { cashCents: number; yapeCents: number };
  byCashier: { userId: string; name: string; salesCount: number; totalCents: number }[];
  byDay: DayRow[];
  topProducts: { productId: string; name: string; units: number; amountCents: number; profitCents: number }[];
};

export type InventoryRow = {
  productId: string;
  name: string;
  genericName: string | null;
  isActive: boolean;
  stock: number;
  minStock: number;
  status: StockStatus;
  costValueCents: number;
  saleValueCents: number;
};

export type InventoryReport = {
  rows: InventoryRow[];
  totals: { stock: number; costValueCents: number; saleValueCents: number };
};

export type ExpiryRow = {
  lotId: string;
  productId: string;
  name: string;
  lotNumber: string;
  expiryDate: string;
  daysLeft: number;
  stock: number;
  costValueCents: number;
};

export type AlertsReport = {
  days: number;
  lowStock: { productId: string; name: string; stock: number; minStock: number; missing: number }[];
  expiringSoon: ExpiryRow[];
  expired: ExpiryRow[];
  atRiskCents: number;
};
