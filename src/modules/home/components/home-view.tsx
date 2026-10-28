"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { AdminHome } from "./admin-home";
import { CashierHome } from "./cashier-home";

/** Inicio: el resumen del día para quien ve reportes; para el resto, su turno y accesos rápidos. */
export function HomeView({ proofEnabled }: { proofEnabled: boolean }) {
  const { can, isLoading } = usePermissions();
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return can("reports.read") ? <AdminHome /> : <CashierHome proofEnabled={proofEnabled} />;
}
