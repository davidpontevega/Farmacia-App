"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate, todayLima } from "@/lib/dates";
import { formatSoles } from "@/lib/money";
import { Can } from "@/modules/auth/components/can";
import type { PickedProduct } from "@/modules/products/components/product-picker";
import { useLots } from "../hooks/use-inventory";
import type { LotRow } from "../types";
import { AdjustDialog } from "./adjust-dialog";
import { NewLotDialog } from "./new-lot-dialog";

export function LotsPanel({ product }: { product: PickedProduct }) {
  const { data, isLoading, error } = useLots(product.id);
  const [newLot, setNewLot] = useState(false);
  const [adjusting, setAdjusting] = useState<LotRow | null>(null);
  const today = todayLima();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Lotes de {product.commercialName}</h2>
        <Can permission="lots.create">
          <Button onClick={() => setNewLot(true)}>Nuevo lote</Button>
        </Can>
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}
      {error && <p className="text-destructive">{apiErrorMessage(error)}</p>}
      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Este producto aún no tiene lotes
                </TableCell>
              </TableRow>
            )}
            {data.map((lot) => {
              const expired = lot.stock > 0 && lot.expiryDate < today;
              return (
                <TableRow key={lot.lotId} className={expired ? "text-destructive" : undefined}>
                  <TableCell>{lot.lotNumber}</TableCell>
                  <TableCell>
                    {formatDate(lot.expiryDate)}
                    {expired && " (vencido)"}
                  </TableCell>
                  <TableCell className="text-right">{formatSoles(lot.purchasePrice)}</TableCell>
                  <TableCell className="text-right font-medium">{lot.stock}</TableCell>
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
      )}

      {newLot && (
        <NewLotDialog
          productId={product.id}
          productName={product.commercialName}
          onClose={() => setNewLot(false)}
        />
      )}
      {adjusting && <AdjustDialog lot={adjusting} onClose={() => setAdjusting(null)} />}
    </div>
  );
}
