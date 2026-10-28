"use client";

import { useState } from "react";
import { Boxes, CalendarClock, Layers, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { addDays, formatDate, todayLima } from "@/lib/dates";
import { formatLocation } from "@/lib/location";
import { formatSoles } from "@/lib/money";
import { EXPIRING_DAYS } from "@/lib/stock";
import { Can } from "@/modules/auth/components/can";
import type { PickedProduct } from "@/modules/products/components/product-picker";
import type { ProductListItem } from "@/modules/products/types";
import { useLots } from "../hooks/use-inventory";
import type { LotRow } from "../types";
import { AdjustDialog } from "./adjust-dialog";
import { NewLotDialog } from "./new-lot-dialog";

type LotState = "expired" | "expiring" | "empty" | "ok";

function lotState(lot: LotRow, today: string): LotState {
  if (lot.stock <= 0) return "empty";
  if (lot.expiryDate < today) return "expired";
  return lot.expiryDate <= addDays(today, EXPIRING_DAYS) ? "expiring" : "ok";
}

const LOT_BADGE: Record<LotState, { label: string; variant: "destructive" | "warning" | "success" | "secondary" }> = {
  expired: { label: "Vencido", variant: "destructive" },
  expiring: { label: "Por vencer", variant: "warning" },
  empty: { label: "Sin stock", variant: "secondary" },
  ok: { label: "Vigente", variant: "success" },
};

function Tile({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-xl p-4 ${tone}`}>
      <p className="flex items-center gap-2 text-xs font-medium">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function LotsPanel({ product }: { product: PickedProduct & Partial<ProductListItem> }) {
  const { data, isLoading, error } = useLots(product.id);
  const [newLot, setNewLot] = useState(false);
  const [adjusting, setAdjusting] = useState<LotRow | null>(null);
  const today = todayLima();

  const withStock = (data ?? []).filter((l) => l.stock > 0);
  const totalStock = withStock.reduce((n, l) => n + l.stock, 0);
  const costValue = withStock.reduce((n, l) => n + l.stock * l.purchasePrice, 0);
  const nextExpiry = withStock.map((l) => l.expiryDate).sort()[0];

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 card-surface p-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">{product.commercialName}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {product.genericName && <span>{product.genericName}</span>}
            {formatLocation(product.shelf, product.shelfRow) && <span className="font-medium text-foreground">{formatLocation(product.shelf, product.shelfRow)}</span>}
            {product.category && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{product.category}</span>}
          </p>
        </div>
        <Can permission="lots.create">
          <Button className="h-11 px-5 font-semibold" onClick={() => setNewLot(true)}>
            Nuevo lote
          </Button>
        </Can>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {error && <p className="text-destructive">{apiErrorMessage(error)}</p>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={Boxes} label="Stock total" value={String(totalStock)} tone="bg-secondary text-secondary-foreground" />
            <Tile icon={Layers} label="Lotes con stock" value={String(withStock.length)} tone="bg-muted text-foreground" />
            <Tile icon={Wallet} label="Valor al costo" value={formatSoles(costValue)} tone="bg-success-soft text-success" />
            <Tile
              icon={CalendarClock}
              label="Próximo vencimiento"
              value={nextExpiry ? formatDate(nextExpiry) : "—"}
              tone={nextExpiry && nextExpiry < today ? "bg-destructive/10 text-destructive" : nextExpiry && nextExpiry <= addDays(today, EXPIRING_DAYS) ? "bg-warning-soft text-warning" : "bg-muted text-foreground"}
            />
          </div>

          <div className="card-surface p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Este producto aún no tiene lotes
                    </TableCell>
                  </TableRow>
                )}
                {data.map((lot) => {
                  const state = lotState(lot, today);
                  const { label, variant } = LOT_BADGE[state];
                  return (
                    <TableRow key={lot.lotId} className={state === "empty" ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{lot.lotNumber}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(lot.expiryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={variant}>{label}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatSoles(lot.purchasePrice)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{lot.stock}</TableCell>
                      <TableCell className="text-right">
                        <Can permission="inventory.adjust">
                          <Button variant="outline" size="sm" onClick={() => setAdjusting(lot)}>
                            Ajustar
                          </Button>
                        </Can>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {newLot && <NewLotDialog productId={product.id} productName={product.commercialName} onClose={() => setNewLot(false)} />}
      {adjusting && <AdjustDialog lot={adjusting} onClose={() => setAdjusting(null)} />}
    </section>
  );
}
