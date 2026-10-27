"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/lib/dates";
import { formatLocation } from "@/lib/location";
import { formatSoles } from "@/lib/money";
import { useDebounce } from "@/lib/use-debounce";
import { Can } from "@/modules/auth/components/can";
import { useProducts, useUpdateProduct } from "../hooks/use-products";
import { PAGE_SIZE, type ProductListItem } from "../types";
import { ProductDialog } from "./product-dialog";
import { StockStatusBadge } from "./stock-status-badge";

export function ProductsTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [includeInactive, setIncludeInactive] = useState(false);
  // null = cerrado; { product: null } = nuevo; { product } = edición
  const [dialog, setDialog] = useState<{ product: ProductListItem | null } | null>(null);

  const q = useDebounce(search.trim());
  const { data, isLoading, error } = useProducts({ q, page, includeInactive });
  const update = useUpdateProduct();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) return <p className="text-destructive">{apiErrorMessage(error)}</p>;

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
        <Can permission="products.create">
          <Button onClick={() => setDialog({ product: null })}>Nuevo producto</Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          className="max-w-xs"
          placeholder="Buscar por nombre comercial o genérico"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => {
              setIncludeInactive(e.target.checked);
              setPage(1);
            }}
          />
          Mostrar inactivos
        </label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Mín.</TableHead>
            <TableHead>Próx. venc.</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                Sin resultados
              </TableCell>
            </TableRow>
          )}
          {data.items.map((p) => (
            <TableRow key={p.id} className={p.isActive ? undefined : "opacity-60"}>
              <TableCell>
                <p className="font-medium">{p.commercialName}</p>
                {p.genericName && (
                  <p className="text-xs text-muted-foreground">{p.genericName}</p>
                )}
              </TableCell>
              <TableCell>{p.category ?? "—"}</TableCell>
              <TableCell>{formatLocation(p.shelf, p.shelfRow) ?? "—"}</TableCell>
              <TableCell className="text-right">{formatSoles(p.salePrice)}</TableCell>
              <TableCell className="text-right font-medium">{p.stock}</TableCell>
              <TableCell className="text-right">{p.minStock}</TableCell>
              <TableCell>{p.nextExpiry ? formatDate(p.nextExpiry) : "—"}</TableCell>
              <TableCell>
                {p.isActive ? <StockStatusBadge status={p.status} /> : "Inactivo"}
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Can permission="products.update">
                  <Button variant="outline" size="sm" onClick={() => setDialog({ product: p })}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: p.id, isActive: !p.isActive })}
                  >
                    {p.isActive ? "Desactivar" : "Reactivar"}
                  </Button>
                </Can>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data.total} productos</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span>
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {dialog && <ProductDialog product={dialog.product} onClose={() => setDialog(null)} />}
    </div>
  );
}
