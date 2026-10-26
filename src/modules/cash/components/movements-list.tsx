import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { MOVEMENT_LABEL, type CashMovementRow } from "../types";

const BADGE_VARIANT = {
  CASH_WITHDRAWAL: "destructive",
  YAPE_TO_CASH_EXCHANGE: "secondary",
  CASH_REFUND: "outline",
} as const;

export function MovementsList({ movements }: { movements: CashMovementRow[] }) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-3 text-base font-medium">Movimientos del turno</h2>
      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin movimientos</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {movements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="flex flex-col gap-0.5">
                <Badge variant={BADGE_VARIANT[m.type]}>
                  {MOVEMENT_LABEL[m.type]}
                </Badge>
                <span className="text-muted-foreground">{m.reason}</span>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatSoles(m.amount)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
