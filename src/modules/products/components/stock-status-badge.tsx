import { Badge } from "@/components/ui/badge";
import type { StockStatus } from "@/lib/stock";

const STATUS: Record<
  StockStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  out: { label: "Agotado", variant: "destructive" },
  expired: { label: "Vencido", variant: "destructive" },
  expiring: { label: "Por vencer", variant: "outline" },
  low: { label: "Stock bajo", variant: "secondary" },
  ok: { label: "OK", variant: "default" },
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { label, variant } = STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
