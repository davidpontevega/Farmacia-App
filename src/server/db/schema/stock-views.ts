import { eq, sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";
import { inventoryMovements } from "./inventory-movement";
import { lots } from "./lot";
import { products } from "./product";

export const lotStock = pgView("lot_stock").as((qb) =>
  qb
    .select({
      lotId: sql<string>`${lots.id}`.as("lot_id"),
      productId: lots.productId,
      lotNumber: lots.lotNumber,
      expiryDate: lots.expiryDate,
      stock:
        sql<number>`coalesce(sum(${inventoryMovements.quantity}), 0)::int`.as(
          "stock",
        ),
    })
    .from(lots)
    .leftJoin(inventoryMovements, eq(inventoryMovements.lotId, lots.id))
    .groupBy(lots.id),
);

// Parte de products para que un producto sin lotes muestre stock 0, no desaparezca.
export const productStock = pgView("product_stock").as((qb) =>
  qb
    .select({
      productId: sql<string>`${products.id}`.as("product_id"),
      stock: sql<number>`coalesce(sum(${lotStock.stock}), 0)::int`.as("stock"),
    })
    .from(products)
    .leftJoin(lotStock, eq(lotStock.productId, products.id))
    .groupBy(products.id),
);
