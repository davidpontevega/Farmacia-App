import type { StockStatus } from "@/lib/stock";

export const PAGE_SIZE = 50;

// Forma JSON de GET /api/products. Precio en centavos; fechas ISO `YYYY-MM-DD`.
export type ProductListItem = {
  id: string;
  commercialName: string;
  genericName: string | null;
  laboratory: string | null;
  category: string | null;
  shelf: string | null;
  shelfRow: string | null;
  salePrice: number;
  minStock: number;
  isActive: boolean;
  stock: number;
  /** Stock de lotes no vencidos: lo que de verdad se puede vender. */
  sellableStock: number;
  nextExpiry: string | null;
  status: StockStatus;
};

export type ProductsResponse = { items: ProductListItem[]; total: number };

export type ProductsQuery = { q?: string; names?: string[]; page: number; includeInactive: boolean };
