import { requirePagePermission } from "@/lib/auth";
import { ProductsTable } from "@/modules/products/components/products-table";

export default async function ProductsPage() {
  await requirePagePermission("products.read");
  return <ProductsTable />;
}
