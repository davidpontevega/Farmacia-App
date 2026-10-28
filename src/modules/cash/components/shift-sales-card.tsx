"use client";

import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatDateTime } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { ProofCell } from "@/modules/sales/components/proof-cell";
import { SaleStatusBadge } from "@/modules/sales/components/sale-status-badge";
import { useShiftSales } from "@/modules/sales/hooks/use-sales";
import { PAYMENT_LABEL } from "@/modules/sales/types";

export function ShiftSalesCard({ proofEnabled }: { proofEnabled: boolean }) {
  const { data, isLoading, error } = useShiftSales();

  return (
    <div className="card-surface p-5">
      <h2 className="mb-3 text-base font-semibold">Ventas del turno</h2>
      {isLoading && <Skeleton className="h-16 w-full" />}
      {error && <p className="text-destructive">{apiErrorMessage(error)}</p>}
      {data && data.length === 0 && <EmptyState icon={Receipt} title="Aún no hay ventas en este turno" description="Cuando cobres, aparecerán aquí." />}
      {data && data.length > 0 && (
        <ul className="flex flex-col divide-y">
          {data.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className={s.status === "VOIDED" ? "font-medium line-through" : "font-medium"}>
                  {s.ticketNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(s.createdAt)} · {PAYMENT_LABEL[s.paymentMethod]}
                  {s.yapeAmount > 0 && s.cashAmount > 0 &&
                    ` (Yape ${formatSoles(s.yapeAmount)})`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ProofCell sale={s} canUpload={proofEnabled} proofEnabled={proofEnabled} />
                <SaleStatusBadge status={s.status} />
                <span className="w-20 text-right font-semibold">{formatSoles(s.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
