"use client";

import { create } from "zustand";

export type CartItem = {
  productId: string;
  name: string;
  unitPrice: number;
  /** Dónde está en el local («Estante 3 · Fila 2»), si se registró. */
  location: string | null;
  quantity: number;
  /** Stock visto al agregar: tope de la cantidad en pantalla (el servidor revalida). */
  stock: number;
};

type CartState = {
  items: CartItem[];
  add: (product: Omit<CartItem, "quantity">) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()((set) => ({
  items: [],

  add: (product) =>
    set(({ items }) => {
      const existing = items.find((i) => i.productId === product.productId);
      if (!existing) return { items: [...items, { ...product, quantity: 1 }] };
      return {
        items: items.map((i) =>
          i.productId === product.productId
            ? { ...i, unitPrice: product.unitPrice, stock: product.stock, quantity: Math.min(i.quantity + 1, product.stock) }
            : i,
        ),
      };
    }),

  setQuantity: (productId, quantity) =>
    set(({ items }) => ({
      items:
        quantity <= 0
          ? items.filter((i) => i.productId !== productId)
          : items.map((i) =>
              i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i,
            ),
    })),

  remove: (productId) =>
    set(({ items }) => ({ items: items.filter((i) => i.productId !== productId) })),

  clear: () => set({ items: [] }),
}));
