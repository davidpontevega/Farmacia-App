// Formas JSON de la API de compras. Montos en centavos; fechas ISO.
export type PurchaseSummary = {
  id: string;
  createdAt: string;
  /** Fecha del documento del proveedor (o el día del registro si no se indicó). */
  documentDate: string;
  supplier: string | null;
  documentNumber: string | null;
  userName: string;
  itemCount: number;
  total: number;
};

export type CreatePurchaseResult = { id: string; total: number };

export const PURCHASES_LIST_LIMIT = 200;

export type SupplierOption = { id: string; name: string };

/** Lo aprendido de compras anteriores: el código del proveedor identifica a un producto. */
export type SupplierLink = {
  supplierCode: string;
  productId: string;
  productName: string;
  unitsPerPackage: number;
};
