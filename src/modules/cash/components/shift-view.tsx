"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate, todayLima } from "@/lib/dates";
import { useActiveShift, useLocalOpenShift } from "../hooks/use-cash";
import { CloseShiftCard } from "./close-shift-card";
import { LocalShiftCard } from "./local-shift-card";
import { MovementForm } from "./movement-form";
import { MovementsList } from "./movements-list";
import { OpenShiftCard } from "./open-shift-card";
import { ShiftSalesCard } from "./shift-sales-card";
import { ShiftSummaryCard } from "./shift-summary";

export function ShiftView({ proofEnabled }: { proofEnabled: boolean }) {
  const { data, isLoading, error } = useActiveShift();
  // Una sola caja: sin turno propio, se mira si la tiene otra persona.
  const local = useLocalOpenShift(data?.shift === null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) return <p className="text-destructive">{apiErrorMessage(error)}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Control de caja</h1>
      {data.shift === null ? (
        local.isLoading ? <Skeleton className="h-40 w-full max-w-sm" /> : local.data ? <LocalShiftCard shift={local.data} /> : <OpenShiftCard />
      ) : (
        <>
          {data.shift.stale && (
            <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
              <p className="font-semibold">Tu turno es del {formatDate(todayLima(new Date(data.shift.openedAt)))}</p>
              <p className="mt-1 text-sm">Cuenta el efectivo y el Yape y ciérralo para continuar. Mientras tanto no se pueden registrar ventas, devoluciones ni movimientos.</p>
            </div>
          )}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <ShiftSummaryCard
                openingAmount={data.shift.openingAmount}
                openedAt={data.shift.openedAt}
                summary={data.summary}
              />
              {!data.shift.stale && <MovementForm />}
            </div>
            <div className="flex flex-col gap-4">
              <MovementsList movements={data.movements} />
              <CloseShiftCard openingAmount={data.shift.openingAmount} summary={data.summary} />
            </div>
          </div>
        </>
      )}
      {data.shift !== null && <ShiftSalesCard proofEnabled={proofEnabled} />}
    </div>
  );
}
