// El servidor corta el kardex en este número de filas.
export const KARDEX_LIMIT = 200;

// Producto nuevo creado desde una compra: stock mínimo inicial (se cambia luego en Productos).
export const NEW_PRODUCT_MIN_STOCK = 5;

export const PRODUCT_CATEGORIES = [
  "Analgésico",
  "Antibiótico",
  "Antiinflamatorio",
  "Gastroprotector",
  "Antidiabético",
  "Antihipertensivo",
  "Vitaminas",
  "Antihistamínico",
  "Antifúngico",
  "Antiparasitario",
  "Otro",
] as const;
