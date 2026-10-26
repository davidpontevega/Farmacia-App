import { check, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id } from "./_shared";
import { products } from "./product";
import { suppliers } from "./supplier";

/** Lo aprendido de compras anteriores: el código del proveedor identifica a un producto nuestro. */
export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: id(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    supplierCode: text("supplier_code").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    unitsPerPackage: integer("units_per_package").notNull().default(1),
  },
  (t) => [
    unique("supplier_products_code_unique").on(t.supplierId, t.supplierCode),
    check("supplier_products_units_positive", sql`${t.unitsPerPackage} >= 1`),
  ],
);
