"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAlertsReport, getInventoryReport, getSalesReport } from "../services/reports.service";
import type { SalesSort } from "../types";

// Solo lectura: se refrescan al volver a abrir la pestaña, no en cada foco de ventana.
const STALE_MS = 30_000;

export const useSalesReport = (range: { from: string; to: string } | null, sort: SalesSort) =>
  useQuery({
    queryKey: ["reports", "sales", range, sort],
    queryFn: () => getSalesReport({ ...range!, sort }),
    enabled: !!range,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

export const useInventoryReport = () =>
  useQuery({ queryKey: ["reports", "inventory"], queryFn: getInventoryReport, staleTime: STALE_MS });

export const useAlertsReport = (days: number) =>
  useQuery({ queryKey: ["reports", "alerts", days], queryFn: () => getAlertsReport(days), staleTime: STALE_MS, placeholderData: keepPreviousData });
