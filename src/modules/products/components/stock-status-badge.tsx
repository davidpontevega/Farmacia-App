import { Badge } from "@/components/ui/badge";
import type { StockStatus } from "@/lib/stock";

const STATUS: Record<
  StockStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  out: { label: "Agotado", variant: "destructive" },
  expired: { label: "Vencido", variant: "destructive" },
  expiring: { label: "Vence pronto", variant: "warning" },
  low: { label: "Stock bajo", variant: "warning" },
  ok: { label: "Disponible", variant: "success" },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { label, variant } = STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
