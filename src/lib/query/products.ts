"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { ProductInput } from "@/lib/db/products";

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  cost: number | null;
  stock_qty: number;
  reorder_level: number;
  is_active: boolean;
  product_categories: { name: string } | null;
  suppliers: { name: string } | null;
};

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useProducts() {
  return useQuery({ queryKey: qk.products, queryFn: () => fetch("/api/products").then((r) => json<Product[]>(r)) });
}

export function useProduct(id: string) {
  return useQuery({ queryKey: qk.product(id), queryFn: () => fetch(`/api/products/${id}`).then((r) => json<Product>(r)), enabled: Boolean(id) });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json<Product>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.products }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProductInput>) => fetch(`/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json<Product>(r)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.products });
      qc.invalidateQueries({ queryKey: qk.product(id) });
    },
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: "DELETE" }).then((r) => json(r)),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.products });
      const prev = qc.getQueryData<Product[]>(qk.products);
      qc.setQueryData<Product[]>(qk.products, (old = []) => old.filter((p) => p.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => qc.setQueryData(qk.products, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.products }),
  });
}
