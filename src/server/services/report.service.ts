import { addDays, todayLima } from "@/lib/dates";
import {
  daysBetween,
  expiryBucket,
  fillDays,
  isStockAlert,
  marginPct,
  stockStatus,
  type ExpiryWindow,
} from "@/lib/reports";
import type { AlertsReport, ExpiryRow, InventoryReport, SalesReport, SalesSort } from "@/modules/reports/types";
import * as repo from "@/server/repositories/report.repository";

export async function salesReport(range: repo.Range, sort: SalesSort): Promise<SalesReport> {
  const [totals, cost, refunds, days, cashiers, top] = await Promise.all([
    repo.salesTotals(range),
    repo.costs(range),
    repo.refundsByDay(range),
    repo.salesByDay(range),
    repo.salesByCashier(range),
    repo.topProducts(range, sort),
  ]);

  const refundCents = refunds.reduce((s, r) => s + r.refunded, 0);
  const netCents = totals.gross - refundCents;
  // Lo devuelto en buen estado vuelve al stock: su costo deja de ser costo de venta.
  const costCents = cost.sold - cost.returned;
  const profitCents = netCents - costCents;

  return {
    ...range,
    grossCents: totals.gross,
    refundCents,
    netCents,
    salesCount: totals.salesCount,
    averageTicketCents: totals.salesCount > 0 ? Math.round(totals.gross / totals.salesCount) : 0,
    costCents,
    profitCents,
    marginPct: marginPct(profitCents, netCents),
    voided: { count: totals.voidedCount, cents: totals.voidedCents },
    byMethod: { cashCents: totals.cash, yapeCents: totals.yape },
    byCashier: cashiers,
    byDay: fillDays(range.from, range.to, days, refunds),
    topProducts: top,
  };
}

export async function inventoryReport(): Promise<InventoryReport> {
  const rows = (await repo.inventoryRows()).map((r) => ({
    productId: r.productId,
    name: r.name,
    genericName: r.genericName,
    isActive: r.isActive,
    stock: r.stock,
    minStock: r.minStock,
    status: stockStatus(r.stock, r.minStock),
    costValueCents: r.costValue,
    saleValueCents: r.stock * r.salePrice,
  }));
  return {
    rows,
    totals: {
      stock: rows.reduce((s, r) => s + r.stock, 0),
      costValueCents: rows.reduce((s, r) => s + r.costValueCents, 0),
      saleValueCents: rows.reduce((s, r) => s + r.saleValueCents, 0),
    },
  };
}

export async function alertsReport(days: ExpiryWindow): Promise<AlertsReport> {
  const today = todayLima();
  const [products, lots] = await Promise.all([repo.inventoryRows(), repo.lotsExpiringBy(addDays(today, days))]);

  const lowStock = products
    .filter((p) => p.isActive && isStockAlert(p.stock, p.minStock))
    .map((p) => ({ productId: p.productId, name: p.name, stock: p.stock, minStock: p.minStock, missing: p.minStock - p.stock }))
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

  const expiringSoon: ExpiryRow[] = [];
  const expired: ExpiryRow[] = [];
  for (const l of lots) {
    const daysLeft = daysBetween(today, l.expiryDate);
    const bucket = expiryBucket(daysLeft, days);
    if (!bucket) continue;
    const row: ExpiryRow = {
      lotId: l.lotId,
      productId: l.productId,
      name: l.name,
      lotNumber: l.lotNumber,
      expiryDate: l.expiryDate,
      daysLeft,
      stock: l.stock,
      costValueCents: l.stock * l.purchasePrice,
    };
    (bucket === "expired" ? expired : expiringSoon).push(row);
  }
  return {
    days,
    lowStock,
    expiringSoon,
    expired,
    atRiskCents: [...expiringSoon, ...expired].reduce((s, r) => s + r.costValueCents, 0),
  };
}
