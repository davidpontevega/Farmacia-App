"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { KARDEX_LIMIT } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import {
  ProductPicker,
  type PickedProduct,
} from "@/modules/products/components/product-picker";
import { useKardex } from "../hooks/use-inventory";
import type { KardexRow } from "../types";

const TYPE_LABEL: Record<KardexRow["type"], string> = {
  ENTRY: "Entrada",
  EXIT: "Salida",
  RETURN: "Devolución",
  ADJUSTMENT: "Ajuste",
};

export function KardexPanel() {
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, error } = useKardex({
    productId: product?.id,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label>Producto (opcional)</Label>
          <ProductPicker selected={product} onSelect={setProduct} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="k-from">Desde</Label>
          <Input id="k-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="k-to">Hasta</Label>
          <Input id="k-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading && <Skeleton className="h-48 w-full" />}
      {error && <p className="text-destructive">{apiErrorMessage(error)}</p>}
      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sin movimientos
                  </TableCell>
                </TableRow>
              )}
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDateTime(m.createdAt)}</TableCell>
                  <TableCell>{m.productName}</TableCell>
                  <TableCell>{m.lotNumber}</TableCell>
                  <TableCell>{TYPE_LABEL[m.type]}</TableCell>
                  <TableCell className="text-right font-medium">
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell>{m.userName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length >= KARDEX_LIMIT && (
            <p className="text-sm text-muted-foreground">
              Se muestran los {KARDEX_LIMIT} movimientos más recientes; filtra por producto o fechas.
            </p>
          )}
        </>
      )}
    </div>
  );
}
