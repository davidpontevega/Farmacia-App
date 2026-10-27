import { api } from "@/lib/axios";
import type { CreateProductInput, UpdateProductInput } from "../schemas";
import type { ProductsQuery, ProductsResponse } from "../types";

export const listProducts = async (params: ProductsQuery) =>
  (await api.get<ProductsResponse>("/products", { params })).data;

export const createProduct = async (input: CreateProductInput) =>
  (await api.post<{ id: string }>("/products", input)).data;

export const updateProduct = async (id: string, input: UpdateProductInput) =>
  (await api.patch(`/products/${id}`, input)).data;

export const listCategories = async () => (await api.get<string[]>("/products/categories")).data;
