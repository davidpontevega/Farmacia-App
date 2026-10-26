"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSoles } from "@/lib/money";
import { useCartStore } from "../store/cart-store";

export function CartTable() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Agrega productos al carrito
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead className="w-32 text-center">Cantidad</TableHead>
          <TableHead className="w-24 text-right">Precio</TableHead>
          <TableHead className="w-24 text-right">Total</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((i) => (
          <TableRow key={i.productId}>
            <TableCell className="font-medium">{i.name}</TableCell>
            <TableCell>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon-xs"
                  aria-label={`Quitar una unidad de ${i.name}`}
                  onClick={() => setQuantity(i.productId, i.quantity - 1)}
                >
                  −
                </Button>
                <span className="w-8 text-center font-medium">{i.quantity}</span>
                <Button
                  variant="outline"
                  size="icon-xs"
                  aria-label={`Agregar una unidad de ${i.name}`}
                  disabled={i.quantity >= i.stock}
                  onClick={() => setQuantity(i.productId, i.quantity + 1)}
                >
                  +
                </Button>
              </div>
            </TableCell>
            <TableCell className="text-right">{formatSoles(i.unitPrice)}</TableCell>
            <TableCell className="text-right font-semibold">
              {formatSoles(i.unitPrice * i.quantity)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Quitar ${i.name} del carrito`}
                onClick={() => remove(i.productId)}
              >
                ✕
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
