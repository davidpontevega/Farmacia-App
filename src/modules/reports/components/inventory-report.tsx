"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/axios";
import { formatSoles } from "@/lib/money";
import { centsText, type StockStatus } from "@/lib/reports";
import { useInventoryReport } from "../hooks/use-reports";
import { CsvButton } from "./csv-button";

const STATUS: Record<StockStatus, string> = { OUT: "Sin stock", LOW: "Bajo mínimo", OK: "OK" };

export function InventoryReport() {
  const { data, isLoading, error } = useInventoryReport();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<StockStatus | "">("");

  const rows = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (data?.rows ?? []).filter(
      (r) =>
        (!status || r.status === status) &&
        (!q || r.name.toLowerCase().includes(q) || (r.genericName ?? "").toLowerCase().includes(q)),
    );
  }, [data, text, status]);

  const totals = useMemo(
    () => ({
      stock: rows.reduce((s, r) => s + r.stock, 0),
      cost: rows.reduce((s, r) => s + r.costValueCents, 0),
      sale: rows.reduce((s, r) => s + r.saleValueCents, 0),
    }),
    [rows],
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error)
    return (
      <p role="alert" className="text-destructive">
        {apiErrorMessage(error)}
      </p>
    );
  if (!data || data.rows.length === 0) return <p className="text-muted-foreground">No hay datos: todavía no hay productos.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="Buscar producto" className="w-64" placeholder="Buscar producto" value={text} onChange={(e) => setText(e.target.value)} />
        <select
          aria-label="Filtrar por estado"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as StockStatus | "")}
        >
          <option value="">Todos los estados</option>
          <option value="OUT">Sin stock</option>
          <option value="LOW">Bajo mínimo</option>
          <option value="OK">OK</option>
        </select>
        <div className="ml-auto">
          <CsvButton
            name="inventario"
            headers={["Producto", "Genérico", "Activo", "Stock", "Mínimo", "Estado", "Valor al costo", "Valor de venta"]}
            rows={rows.map((r) => [
              r.name,
              r.genericName,
              r.isActive ? "Sí" : "No",
              r.stock,
              r.minStock,
              STATUS[r.status],
              centsText(r.costValueCents),
              centsText(r.saleValueCents),
            ])}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Ningún producto coincide con el filtro.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Valor al costo</TableHead>
              <TableHead className="text-right">Valor de venta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.productId}>
                <TableCell>
                  <p className="font-medium">
                    {r.name} {!r.isActive && <Badge variant="outline">Inactivo</Badge>}
                  </p>
                  {r.genericName && <p className="text-xs text-muted-foreground">{r.genericName}</p>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.stock}</TableCell>
                <TableCell className="text-right tabular-nums">{r.minStock}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "OK" ? "secondary" : "destructive"}>{STATUS[r.status]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatSoles(r.costValueCents)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatSoles(r.saleValueCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Total ({rows.length} productos)</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{totals.stock}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right font-medium tabular-nums">{formatSoles(totals.cost)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatSoles(totals.sale)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  );
}
