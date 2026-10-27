"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ListOrdered } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { KARDEX_LIMIT } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import type { ProductListItem } from "@/modules/products/types";
import { useKardex } from "../hooks/use-inventory";
import type { KardexRow } from "../types";
import { ProductList } from "./product-list";

const TYPE: Record<KardexRow["type"], { label: string; variant: "success" | "destructive" | "secondary" | "warning" }> = {
  ENTRY: { label: "Entrada", variant: "success" },
  EXIT: { label: "Salida", variant: "destructive" },
  RETURN: { label: "Devolución", variant: "secondary" },
  ADJUSTMENT: { label: "Ajuste", variant: "warning" },
};

function Tile({ icon: Icon, label, value, tone }: { icon: typeof ListOrdered; label: string; value: string; tone: string }) {
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

export function KardexPanel() {
  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, error } = useKardex({
    productId: product?.id,
    from: from || undefined,
    to: to || undefined,
  });

  const entered = (data ?? []).filter((m) => m.quantity > 0).reduce((n, m) => n + m.quantity, 0);
  const left = (data ?? []).filter((m) => m.quantity < 0).reduce((n, m) => n + m.quantity, 0);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <ProductList selectedId={product?.id ?? null} onSelect={setProduct} allLabel="Todos los productos" onClear={() => setProduct(null)} />

      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-card p-5">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{product ? product.commercialName : "Todos los productos"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Entradas, salidas, devoluciones y ajustes de stock.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="k-from" className="text-xs text-muted-foreground">
                Desde
              </Label>
              <Input id="k-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="k-to" className="text-xs text-muted-foreground">
                Hasta
              </Label>
              <Input id="k-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>

        {isLoading && <Skeleton className="h-48 w-full" />}
        {error && <p className="text-destructive">{apiErrorMessage(error)}</p>}
        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Tile icon={ArrowDownToLine} label="Entraron" value={`+${entered}`} tone="bg-success-soft text-success" />
              <Tile icon={ArrowUpFromLine} label="Salieron" value={String(left)} tone="bg-destructive/10 text-destructive" />
              <Tile icon={ListOrdered} label="Movimientos" value={String(data.length)} tone="bg-secondary text-secondary-foreground" />
            </div>

            <div className="rounded-2xl border bg-card p-2">
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
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Sin movimientos
                      </TableCell>
                    </TableRow>
                  )}
                  {data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="tabular-nums">{formatDateTime(m.createdAt)}</TableCell>
                      <TableCell className="font-medium">{m.productName}</TableCell>
                      <TableCell>{m.lotNumber}</TableCell>
                      <TableCell>
                        <Badge variant={TYPE[m.type].variant}>{TYPE[m.type].label}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${m.quantity > 0 ? "text-success" : "text-destructive"}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </TableCell>
                      <TableCell className="whitespace-normal">{m.reason}</TableCell>
                      <TableCell>{m.userName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.length >= KARDEX_LIMIT && (
              <p className="text-sm text-muted-foreground">
                Se muestran los {KARDEX_LIMIT} movimientos más recientes; los totales de arriba son de esos movimientos. Filtra por producto o fechas.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
