import { Badge } from "@/components/ui/badge";
import type { SaleStatus } from "../types";

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return status === "VOIDED" ? (
    <Badge variant="destructive">Anulada</Badge>
  ) : (
    <Badge variant="success">Completada</Badge>
  );
}
