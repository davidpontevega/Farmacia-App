"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/axios";
import { useActiveShift } from "../hooks/use-cash";
import { CloseShiftCard } from "./close-shift-card";
import { MovementForm } from "./movement-form";
import { MovementsList } from "./movements-list";
import { OpenShiftCard } from "./open-shift-card";
import { ShiftSalesCard } from "./shift-sales-card";
import { ShiftSummaryCard } from "./shift-summary";

export function ShiftView() {
  const { data, isLoading, error } = useActiveShift();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) return <p className="text-destructive">{apiErrorMessage(error)}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Control de caja</h1>
      {data.shift === null ? (
        <OpenShiftCard />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <ShiftSummaryCard
              openingAmount={data.shift.openingAmount}
              openedAt={data.shift.openedAt}
              summary={data.summary}
            />
            <MovementForm />
          </div>
          <div className="flex flex-col gap-4">
            <MovementsList movements={data.movements} />
            <CloseShiftCard openingAmount={data.shift.openingAmount} summary={data.summary} />
          </div>
        </div>
      )}
      {data.shift !== null && <ShiftSalesCard />}
    </div>
  );
}
