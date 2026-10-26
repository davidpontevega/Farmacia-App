"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import type { CreateProductInput, UpdateProductInput } from "../schemas";
import { createProduct, listProducts, updateProduct } from "../services/products.service";
import type { ProductsQuery } from "../types";

export const useProducts = (params: ProductsQuery) =>
  useQuery({
    queryKey: ["products", params],
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData,
  });

function useProductsMutation<V>(fn: (v: V) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success);
      return qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}

export const useCreateProduct = () =>
  useProductsMutation((input: CreateProductInput) => createProduct(input), "Producto creado");

export const useUpdateProduct = () =>
  useProductsMutation(
    ({ id, ...input }: { id: string } & UpdateProductInput) => updateProduct(id, input),
    "Producto actualizado",
  );
