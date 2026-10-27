"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/axios";
import { mergeCategories } from "@/lib/categories";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import type { CreateProductInput, UpdateProductInput } from "../schemas";
import { createProduct, listCategories, listProducts, updateProduct } from "../services/products.service";
import type { ProductsQuery } from "../types";

/** Categorías ya usadas más las sugeridas, sin repetir (sin distinguir mayúsculas), ordenadas. */
export const useCategories = () => {
  const { data } = useQuery({ queryKey: ["product-categories"], queryFn: listCategories, staleTime: 60_000 });
  return mergeCategories(PRODUCT_CATEGORIES, data ?? []);
};

export const useProducts = (params: ProductsQuery, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ["products", params],
    queryFn: () => listProducts(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });

function useProductsMutation<V>(fn: (v: V) => Promise<unknown>, success: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success);
      return Promise.all([qc.invalidateQueries({ queryKey: ["products"] }), qc.invalidateQueries({ queryKey: ["product-categories"] })]);
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
