// Reglas puras de compra. Todo en centavos.

export const MAX_PURCHASE_TOTAL = 2_000_000_000; // tope de una columna integer (S/ 20.000.000)

export const purchaseTotal = (items: { purchasePrice: number; quantity: number }[]) =>
  items.reduce((sum, i) => sum + i.purchasePrice * i.quantity, 0);

/** "  Paracetamol   500MG " -> "paracetamol 500mg": dos ítems nuevos así son el mismo producto. */
export const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Clave de producto de un ítem: el id si existe, o el nombre normalizado si es nuevo. */
export const productKey = (item: { productId?: string; newProduct?: { commercialName: string } }) =>
  item.productId ?? `new:${nameKey(item.newProduct?.commercialName ?? "")}`;

/** Primer número de lote repetido para el mismo producto dentro de la compra, o null. */
export function findDuplicateLot(items: { productKey: string; lotNumber: string }[]): string | null {
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.productKey}|${item.lotNumber.trim().toLowerCase()}`;
    if (seen.has(key)) return item.lotNumber.trim();
    seen.add(key);
  }
  return null;
}

// Topes del servidor (createPurchaseSchema): el formulario los comprueba antes de enviar.
export const MAX_UNIT_COST = 100_000_000; // S/ 1.000.000 por unidad
export const MAX_SALE_PRICE = 100_000_000;
export const MAX_UNITS_PER_PACKAGE = 100_000;
export const MAX_ITEMS = 200;
