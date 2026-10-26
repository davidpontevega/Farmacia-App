"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToInput, toCents } from "@/lib/money";
import { useCreateProduct, useUpdateProduct } from "../hooks/use-products";
import { productFormSchema, type ProductFormValues } from "../schemas";
import type { ProductListItem } from "../types";

const TEXT_FIELDS = [
  ["commercialName", "Nombre comercial"],
  ["genericName", "Nombre genérico"],
  ["laboratory", "Laboratorio"],
  ["category", "Categoría"],
] as const;

// Se monta al abrir (el padre lo renderiza condicionalmente), así el formulario
// siempre arranca con los valores del producto elegido.
export function ProductDialog({
  product,
  onClose,
}: {
  product: ProductListItem | null;
  onClose: () => void;
}) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const pending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      commercialName: product?.commercialName ?? "",
      genericName: product?.genericName ?? "",
      laboratory: product?.laboratory ?? "",
      category: product?.category ?? "",
      salePrice: product ? centsToInput(product.salePrice) : "",
      minStock: String(product?.minStock ?? 0),
    },
  });

  const onSubmit = (v: ProductFormValues) => {
    const input = {
      commercialName: v.commercialName,
      genericName: v.genericName,
      laboratory: v.laboratory,
      category: v.category,
      salePrice: toCents(v.salePrice),
      minStock: Number(v.minStock),
    };
    const options = { onSuccess: onClose };
    if (product) update.mutate({ id: product.id, ...input }, options);
    else create.mutate(input, options);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {TEXT_FIELDS.map(([name, label]) => (
            <div key={name} className="flex flex-col gap-1">
              <Label htmlFor={`p-${name}`}>{label}</Label>
              <Input id={`p-${name}`} {...register(name)} />
              {errors[name] && (
                <p className="text-sm text-destructive">{errors[name]?.message}</p>
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="p-salePrice">Precio de venta (S/)</Label>
              <Input id="p-salePrice" inputMode="decimal" {...register("salePrice")} />
              {errors.salePrice && (
                <p className="text-sm text-destructive">{errors.salePrice.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="p-minStock">Stock mínimo</Label>
              <Input id="p-minStock" inputMode="numeric" {...register("minStock")} />
              {errors.minStock && (
                <p className="text-sm text-destructive">{errors.minStock.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
