import { api } from "@/lib/axios";
import type { AlertsReport, InventoryReport, SalesReport, SalesSort } from "../types";

export const getSalesReport = async (params: { from: string; to: string; sort: SalesSort }) =>
  (await api.get<SalesReport>("/reports/sales", { params })).data;

export const getInventoryReport = async () => (await api.get<InventoryReport>("/reports/inventory")).data;

export const getAlertsReport = async (days: number) =>
  (await api.get<AlertsReport>("/reports/alerts", { params: { days } })).data;
