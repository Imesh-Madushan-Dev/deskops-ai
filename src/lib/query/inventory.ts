"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { ReorderInput } from "@/lib/db/inventory";

type LowStockItem = { id: string; name: string; sku: string | null; stock_qty: number; reorder_level: number };
type StockMovement = { id: string; delta: number; reason: string; created_at: string; products: { name: string } | null };
export type Reorder = { id: string; quantity: number; status: string; created_at: string; products: { name: string; sku: string | null } | null; suppliers: { name: string } | null };

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useInventory() {
  return useQuery({ queryKey: qk.inventory, queryFn: () => fetch("/api/inventory").then((r) => json<{ lowStock: LowStockItem[]; movements: StockMovement[] }>(r)) });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; delta: number; reason: "restock" | "adjustment" }) =>
      fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json(r)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.products });
    },
  });
}

export function useReorders() {
  return useQuery({ queryKey: qk.reorders, queryFn: () => fetch("/api/reorders").then((r) => json<Reorder[]>(r)) });
}

export function useCreateReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderInput) => fetch("/api/reorders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reorders }),
  });
}

export function useUpdateReorderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ordered" | "received" }) =>
      fetch(`/api/reorders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => json(r)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.reorders });
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.products });
    },
  });
}
